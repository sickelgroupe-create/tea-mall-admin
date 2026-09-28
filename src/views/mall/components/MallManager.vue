<template>
  <div class="mall-manager">
    <section class="page-head">
      <div>
        <span class="eyebrow">TEA MALL</span>
        <h1>{{ config.title }}</h1>
        <p>{{ config.description }}</p>
      </div>
      <div class="head-actions">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索当前列表"
          :prefix-icon="Search"
        />
        <el-button
          v-if="canCreate"
          v-hasPermi="[permissions.edit]"
          type="primary"
          :icon="Plus"
          @click="openCreate"
          >新增{{ config.singular }}</el-button
        >
        <el-button :icon="Refresh" @click="load">刷新数据</el-button>
      </div>
    </section>

    <slot name="settings" />
    <section class="summary-row">
      <div>
        <strong>{{ filteredRows.length }}</strong
        ><span>当前记录</span>
      </div>
      <div>
        <strong>{{ activeCount }}</strong
        ><span>{{ config.activeLabel }}</span>
      </div>
      <div>
        <strong>{{ updatedAt }}</strong
        ><span>最后刷新</span>
      </div>
    </section>

    <section class="table-card" v-loading="loading">
      <el-table :data="pagedRows" stripe empty-text="暂无业务数据">
        <el-table-column type="index" label="#" width="56" />
        <el-table-column v-if="config.imageProp" label="图片" width="82">
          <template #default="scope">
            <el-image
              class="product-image"
              :src="imageUrl(scope.row[config.imageProp])"
              fit="cover"
            >
              <template #error><div class="image-fallback">茶</div></template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column
          v-for="column in config.columns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :min-width="column.width || 110"
          show-overflow-tooltip
        >
          <template #default="scope">
            <el-tag
              v-if="column.tag"
              :type="tagType(scope.row[column.prop])"
              effect="light"
            >
              {{ displayValue(scope.row[column.prop], column) }}
            </el-tag>
            <span v-else-if="column.money" class="money"
              >¥{{ scope.row[column.prop] }}</span
            >
            <span v-else>{{
              displayValue(scope.row[column.prop], column)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column
          v-if="config.fields && config.fields.length"
          label="操作"
          fixed="right"
          :width="canDelete ? 170 : 112"
        >
          <template #default="scope">
            <el-button
              v-hasPermi="[permissions.edit]"
              link
              type="primary"
              :icon="Edit"
              @click="openEdit(scope.row)"
              >查看 / 编辑</el-button
            >
            <el-button
              v-if="canDelete"
              v-hasPermi="[permissions.remove]"
              link
              type="danger"
              :icon="Delete"
              @click="removeRow(scope.row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100]" :total="filteredRows.length"
        layout="total, sizes, prev, pager, next, jumper" style="margin-top: 18px" />
    </section>

    <el-dialog
      v-model="dialogOpen"
      :title="`${form.id ? '编辑' : '新增'}${config.singular}`"
      width="min(720px, calc(100vw - 32px))"
      append-to-body
      destroy-on-close
    >
      <el-form label-position="top" class="edit-form">
        <el-form-item
          v-for="field in config.fields"
          :key="field.prop"
          :label="field.label"
        >
          <el-select
            v-if="field.type === 'select'"
            v-model="form[field.prop]"
            :multiple="field.multiple"
            filterable
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="option in fieldOptions(field)"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="form[field.prop]"
            :min="field.min ?? 0"
            :precision="field.precision || 0"
            controls-position="right"
            style="width: 100%"
            :disabled="field.readonly"
          />
          <div v-else-if="field.type === 'media'" class="media-uploader">
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              accept="image/jpeg,image/png,image/webp"
              :show-file-list="false"
              :on-success="(response) => handleMainUpload(field.prop, response)"
            >
              <el-button type="primary" plain :icon="UploadFilled"
                >上传图片</el-button
              >
            </el-upload>
            <span>支持 JPG、PNG、WebP，上传后可预览并同步前台</span>
          </div>
          <div v-else-if="field.type === 'gallery'" class="gallery-uploader">
            <div class="gallery-list">
              <div
                v-for="(image, index) in form[field.prop]"
                :key="`${field.prop}-${image}-${index}`"
                class="gallery-item"
              >
                <el-image :src="imageUrl(image)" fit="cover" />
                <div class="gallery-actions">
                  <el-button
                    circle
                    size="small"
                    :icon="ArrowLeft"
                    :disabled="index === 0"
                    @click="moveMediaListImage(field.prop, index, -1)"
                  />
                  <el-button
                    circle
                    size="small"
                    :icon="ArrowRight"
                    :disabled="index === form[field.prop].length - 1"
                    @click="moveMediaListImage(field.prop, index, 1)"
                  />
                  <el-button
                    circle
                    type="danger"
                    size="small"
                    :icon="Delete"
                    @click="removeMediaListImage(field.prop, index)"
                  />
                </div>
              </div>
            </div>
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              accept="image/jpeg,image/png,image/webp"
              multiple
              :show-file-list="false"
              :on-success="
                (response) => handleMediaListUpload(field.prop, response)
              "
            >
              <el-button type="primary" plain :icon="UploadFilled">{{
                field.prop === "galleryImages" ? "添加轮播图" : "添加详情图"
              }}</el-button>
            </el-upload>
          </div>
          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="form[field.prop]"
            type="textarea"
            :rows="4"
            :disabled="field.readonly"
          />
          <el-input
            v-else
            v-model="form[field.prop]"
            :disabled="field.readonly"
          />
        </el-form-item>
        <div
          v-if="mode === 'product' && form.imageKey"
          class="image-preview-row"
        >
          <el-image :src="imageUrl(form.imageKey)" fit="cover" />
          <span>前台商品图预览 · 图片会随商品同步展示</span>
        </div>
        <div v-if="mode === 'aftersale' || mode === 'order'" class="operation-timeline">
          <h3>完整操作日志</h3>
          <el-timeline v-if="form.operations && form.operations.length">
            <el-timeline-item
              v-for="(item, index) in form.operations"
              :key="`${item.createTime}-${index}`"
              :timestamp="item.createTime"
            >
              <strong>{{ item.oldStatus || "创建" }} → {{ item.newStatus }}</strong>
              <p>{{ item.operatorType }} · {{ item.sourceName }} · {{ item.remark || item.reason || "无补充说明" }}</p>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无操作日志" :image-size="72" />
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogOpen = false">取消</el-button>
        <el-button v-hasPermi="[permissions.edit]" type="primary" :loading="saving" @click="save"
          >保存并同步三端</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ArrowLeft,
  ArrowRight,
  Delete,
  Edit,
  Plus,
  Refresh,
  Search,
  UploadFilled,
} from "@element-plus/icons-vue";
import { createMall, deleteMall, listMall, updateMall } from "@/api/mall";
import { getToken } from "@/utils/auth";

const props = defineProps({ mode: { type: String, required: true } });
const { proxy } = getCurrentInstance();
const baseUrl = import.meta.env.VITE_APP_BASE_API;
const uploadUrl = `${baseUrl}/common/upload`;
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${getToken()}`,
}));

const onOff = [
  { label: "启用", value: "0" },
  { label: "停用", value: "1" },
];

const customerStatusOptions = [
  { label: "正常", value: "0" },
  { label: "停用", value: "1" },
];

const imageOptions = [
  ["longjing-pale", "明前龙井主图"],
  ["longjing-dark", "雨前龙井主图"],
  ["biluochun", "绿茶罐装"],
  ["blacktea-red", "红茶罐装"],
  ["blacktea-orange", "暖色茶罐"],
  ["tea-gift", "茶叶礼盒"],
  ["maofeng-pouch", "袋装毛峰"],
  ["yixing-pot", "紫砂壶"],
  ["porcelain-cup", "白瓷茶杯"],
  ["travel-set", "旅行茶具"],
  ["canvas-tote", "帆布袋"],
  ["wood-tray", "木质茶盘"],
].map(([value, label]) => ({ value, label }));

const configs = {
  product: {
    endpoint: "products",
    imageProp: "imageKey",
    title: "商品管理",
    singular: "商品",
    description: "前台商品、价格、库存和上下架状态使用同一份实时数据。",
    activeLabel: "在售商品",
    columns: [
      { prop: "name", label: "商品名称", width: 190 },
      { prop: "category", label: "分类" },
      { prop: "spec", label: "规格" },
      { prop: "price", label: "售价", money: true },
      { prop: "stock", label: "库存" },
      { prop: "sales", label: "销量" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "在售", 1: "下架" },
      },
    ],
    fields: [
      { prop: "name", label: "商品名称" },
      { prop: "shortName", label: "展示简称" },
      { prop: "commissionAmount", label: "直属提成（元/单，同商品不乘件数）", type: "number", precision: 2, min: 0 },
      { prop: "storeId", label: "所属店铺ID", type: "number" },
      { prop: "categoryId", label: "商品分类", type: "select" },
      { prop: "spec", label: "规格" },
      { prop: "price", label: "售价", type: "number", precision: 2 },
      {
        prop: "reward",
        label: "预计积分（按后台消费比例计算）",
        type: "number",
        readonly: true,
      },
      { prop: "stock", label: "库存", type: "number" },
      { prop: "imageKey", label: "商品主图", type: "media" },
      {
        prop: "galleryImages",
        label: "商品轮播图（可排序展示）",
        type: "gallery",
      },
      { prop: "detailImages", label: "商品详情图", type: "gallery" },
      { prop: "origin", label: "产地" },
      { prop: "gradeName", label: "等级 / 工艺" },
      { prop: "rawMaterial", label: "原料" },
      { prop: "shelfLife", label: "保质期" },
      { prop: "brewGuide", label: "冲泡 / 使用建议", type: "textarea" },
      { prop: "batchNo", label: "批次" },
      { prop: "traceabilityInfo", label: "溯源信息", type: "textarea" },
      { prop: "description", label: "商品文字详情", type: "textarea" },
      { prop: "status", label: "销售状态", type: "select", options: onOff },
    ],
  },
  category: {
    endpoint: "categories",
    imageProp: "iconUrl",
    title: "商品分类",
    singular: "分类",
    description:
      "维护分类名称、排序和前台展示状态；分类改名会同步更新所属商品。",
    activeLabel: "前台展示分类",
    columns: [
      { prop: "name", label: "分类名称", width: 180 },
      { prop: "categoryGroup", label: "售卖栏" },
      { prop: "parentId", label: "父分类ID" },
      { prop: "productCount", label: "商品数" },
      { prop: "sortNo", label: "排序" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "展示", 1: "隐藏", 2: "即将上线" },
      },
    ],
    fields: [
      { prop: "name", label: "分类名称" },
      { prop: "categoryCode", label: "分类编码" },
      {
        prop: "categoryGroup",
        label: "售卖栏",
        type: "select",
        options: [
          { label: "茶叶", value: "TEA" },
          { label: "茶具", value: "TEAWARE" },
        ],
      },
      {
        prop: "parentId",
        label: "父分类（茶叶/茶具根分类留空）",
        type: "select",
      },
      { prop: "iconUrl", label: "分类图片", type: "media" },
      { prop: "sortNo", label: "排序", type: "number" },
      {
        prop: "status",
        label: "展示状态",
        type: "select",
        options: [
          { label: "展示", value: "0" },
          { label: "隐藏", value: "1" },
          { label: "即将上线", value: "2" },
        ],
      },
    ],
  },
  topic: {
    endpoint: "topics",
    imageProp: "heroImageUrl",
    title: "首页专题",
    singular: "专题",
    description: "专题内容、有效期与商品顺序直接同步到首页专题页。",
    activeLabel: "正在展示专题",
    columns: [
      { prop: "title", label: "专题名称", width: 200 },
      { prop: "slug", label: "路由标识", width: 180 },
      { prop: "productIds", label: "商品ID顺序", width: 180 },
      { prop: "sortNo", label: "排序" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "展示", 1: "停用" },
      },
    ],
    fields: [
      { prop: "slug", label: "路由标识（小写字母/数字/连字符）" },
      { prop: "title", label: "专题标题" },
      { prop: "kicker", label: "专题眉题" },
      { prop: "subtitle", label: "专题副标题" },
      { prop: "heroImageUrl", label: "头图", type: "media" },
      { prop: "storyImageUrl", label: "故事图片", type: "media" },
      { prop: "storyTitle", label: "故事标题" },
      { prop: "storyContent", label: "故事内容", type: "textarea" },
      {
        prop: "productIds",
        label: "关联商品（选择顺序即展示顺序）",
        type: "select",
        multiple: true,
      },
      { prop: "startTime", label: "开始时间（可留空，YYYY-MM-DD HH:mm:ss）" },
      { prop: "endTime", label: "结束时间（可留空）" },
      { prop: "sortNo", label: "排序", type: "number" },
      { prop: "status", label: "展示状态", type: "select", options: onOff },
    ],
  },
  store: {
    endpoint: "stores",
    imageProp: "heroImageUrl",
    title: "品牌店铺",
    singular: "店铺",
    description: "维护品牌信息、承诺与店铺故事，前台品牌页实时读取。",
    activeLabel: "营业店铺",
    columns: [
      { prop: "name", label: "店铺名称", width: 220 },
      { prop: "productCount", label: "商品数" },
      { prop: "rating", label: "评分" },
      { prop: "memberFollowerCount", label: "会员关注" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "营业", 1: "停用" },
      },
    ],
    fields: [
      { prop: "name", label: "店铺名称" },
      { prop: "logoUrl", label: "品牌Logo", type: "media" },
      { prop: "heroImageUrl", label: "店铺头图", type: "media" },
      { prop: "rating", label: "基础评分", type: "number", precision: 2 },
      { prop: "followerCount", label: "历史关注基数", type: "number" },
      { prop: "story", label: "品牌故事", type: "textarea" },
      { prop: "shippingPromise", label: "配送承诺" },
      { prop: "servicePromise", label: "售后承诺" },
      { prop: "status", label: "营业状态", type: "select", options: onOff },
    ],
  },
  sku: {
    endpoint: "skus",
    title: "商品规格 SKU",
    singular: "商品规格",
    description:
      "价格、库存和销售规格以 SKU 为准，购物车与订单保存具体 SKU 快照。",
    activeLabel: "在售规格",
    columns: [
      { prop: "productName", label: "商品", width: 220 },
      { prop: "skuCode", label: "SKU编码", width: 190 },
      { prop: "spec", label: "规格" },
      { prop: "price", label: "售价", money: true },
      { prop: "stock", label: "库存" },
      { prop: "sales", label: "销量" },
      { prop: "isDefault", label: "默认", map: { 0: "否", 1: "是" } },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "在售", 1: "停用" },
      },
    ],
    fields: [
      { prop: "productId", label: "所属商品", type: "select" },
      { prop: "productName", label: "商品名称", readonly: true },
      { prop: "skuCode", label: "SKU编码" },
      { prop: "spec", label: "规格名称" },
      { prop: "price", label: "售价", type: "number", precision: 2 },
      { prop: "stock", label: "库存", type: "number" },
      {
        prop: "isDefault",
        label: "设为默认规格",
        type: "select",
        options: [
          { label: "否", value: 0 },
          { label: "是", value: 1 },
        ],
      },
      { prop: "status", label: "销售状态", type: "select", options: onOff },
    ],
  },
  order: {
    endpoint: "orders",
    title: "订单管理",
    singular: "订单",
    description:
      "待付款订单只能由用户支付或取消；后台负责已支付订单的发货、物流和履约。",
    activeLabel: "进行中订单",
    columns: [
      { prop: "orderNo", label: "订单号", width: 180 },
      { prop: "nickname", label: "客户" },
      { prop: "itemSummary", label: "商品明细", width: 260 },
      { prop: "itemCount", label: "数量" },
      { prop: "paidAmount", label: "应付金额", money: true },
      { prop: "paymentStatus", label: "支付状态", tag: true },
      { prop: "status", label: "订单状态", tag: true },
      { prop: "receiverName", label: "收货人" },
      { prop: "receiverPhone", label: "手机号", width: 130 },
      { prop: "receiverAddress", label: "完整收货地址", width: 260 },
      { prop: "trackingNo", label: "物流单号", width: 170 },
      { prop: "createTime", label: "下单时间", width: 165 },
    ],
    fields: [
      { prop: "orderNo", label: "订单号", readonly: true },
      {
        prop: "itemSummary",
        label: "商品明细（名称 / 规格 / 数量）",
        type: "textarea",
        readonly: true,
      },
      { prop: "receiverName", label: "收货人", readonly: true },
      { prop: "receiverPhone", label: "手机号", readonly: true },
      {
        prop: "receiverAddress",
        label: "完整收货地址",
        type: "textarea",
        readonly: true,
      },
      { prop: "totalAmount", label: "商品总额", readonly: true },
      { prop: "shippingFee", label: "运费", readonly: true },
      { prop: "discountAmount", label: "优惠金额", readonly: true },
      { prop: "pointsDiscount", label: "积分抵扣金额", readonly: true },
      { prop: "pointsUsed", label: "使用积分", readonly: true },
      { prop: "paidAmount", label: "实付款", readonly: true },
      { prop: "paymentMethod", label: "支付方式", readonly: true },
      { prop: "paymentStatus", label: "支付状态", readonly: true },
      { prop: "paidTime", label: "支付时间", readonly: true },
      { prop: "refundedAmount", label: "累计退款金额", readonly: true },
      { prop: "aftersaleStatus", label: "售后状态", readonly: true },
      { prop: "cancelReason", label: "取消原因", readonly: true },
      { prop: "cancelNote", label: "取消说明", type: "textarea", readonly: true },
      { prop: "cancelTime", label: "取消时间", readonly: true },
      {
        prop: "status",
        label: "订单状态",
        type: "select",
        options: [
          "待付款",
          "待发货",
          "待收货",
          "已完成",
          "售后中",
          "部分售后完成",
          "已退款",
          "已取消",
          "已关闭",
        ].map((value) => ({ label: value, value })),
      },
      { prop: "carrier", label: "物流公司" },
      { prop: "trackingNo", label: "物流单号" },
    ],
  },
  aftersale: {
    endpoint: "aftersales",
    title: "售后管理",
    singular: "售后申请",
    description: "统一受理退款、退货退款与换货申请。",
    activeLabel: "待处理申请",
    columns: [
      { prop: "aftersaleNo", label: "售后单号", width: 190 },
      { prop: "orderNo", label: "订单号", width: 180 },
      { prop: "nickname", label: "客户" },
      { prop: "typeName", label: "类型" },
      { prop: "reason", label: "申请原因", width: 200 },
      { prop: "requestedAmount", label: "申请金额", money: true },
      { prop: "refundAmount", label: "退款金额", money: true },
      { prop: "status", label: "状态", tag: true },
      { prop: "createTime", label: "申请时间", width: 165 },
    ],
    fields: [
      { prop: "aftersaleNo", label: "售后单号", readonly: true },
      { prop: "orderNo", label: "订单号", readonly: true },
      { prop: "typeName", label: "售后类型", readonly: true },
      { prop: "productName", label: "申请商品", readonly: true },
      { prop: "spec", label: "SKU规格", readonly: true },
      { prop: "qty", label: "申请数量", readonly: true },
      {
        prop: "reason",
        label: "客户申请原因",
        type: "textarea",
        readonly: true,
      },
      {
        prop: "receiverAddress",
        label: "履约地址",
        type: "textarea",
        readonly: true,
      },
      { prop: "paidAmount", label: "订单实付款", readonly: true },
      { prop: "requestedAmount", label: "申请退款金额", readonly: true },
      {
        prop: "description",
        label: "用户问题说明",
        type: "textarea",
        readonly: true,
      },
      {
        prop: "status",
        label: "处理状态",
        type: "select",
        options: [
          "申请中",
          "审核拒绝",
          "等待用户退货",
          "退货运输中",
          "商家已收货",
          "退款处理中",
          "退款成功",
          "换货已发出",
          "售后完成",
          "已关闭",
        ].map((value) => ({ label: value, value })),
      },
      { prop: "returnAddress", label: "商家退货地址", type: "textarea" },
      { prop: "returnCarrier", label: "用户退货物流", readonly: true },
      { prop: "returnTrackingNo", label: "用户退货单号", readonly: true },
      { prop: "exchangeCarrier", label: "换货物流公司" },
      { prop: "exchangeTrackingNo", label: "换货物流单号" },
      { prop: "adminRemark", label: "审核意见 / 退款备注", type: "textarea" },
    ],
  },
  notification: {
    endpoint: "notifications",
    title: "消息中心",
    singular: "会员消息",
    description:
      "订单、支付、发货和售后消息由业务状态机自动写入；后台可发布真实运营或系统通知。",
    activeLabel: "未读消息",
    columns: [
      { prop: "nickname", label: "会员" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "category", label: "分类", tag: true },
      { prop: "title", label: "标题", width: 200 },
      { prop: "content", label: "内容", width: 320 },
      { prop: "sourceType", label: "来源" },
      {
        prop: "readStatus",
        label: "阅读状态",
        tag: true,
        map: { 0: "未读", 1: "已读" },
      },
      { prop: "createTime", label: "发送时间", width: 165 },
    ],
    fields: [
      { prop: "customerId", label: "会员编号", type: "number" },
      {
        prop: "category",
        label: "消息分类",
        type: "select",
        options: ["订单", "活动", "系统"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "title", label: "消息标题" },
      { prop: "content", label: "消息内容", type: "textarea" },
      { prop: "targetRoute", label: "前台目标路由（可留空）" },
      { prop: "targetQuery", label: "跳转参数（如 orderNo=O2026…）" },
    ],
  },
  reward: {
    endpoint: "rewards",
    title: "积分商品",
    singular: "积分商品",
    description: "积分商城库存与兑换成本实时同步到移动端。",
    activeLabel: "可兑换商品",
    columns: [
      { prop: "name", label: "商品名称", width: 190 },
      { prop: "category", label: "分类" },
      { prop: "points", label: "所需积分" },
      { prop: "stock", label: "库存" },
      { prop: "limitQty", label: "限购" },
      { prop: "deliveryMethod", label: "配送" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "可兑换", 1: "已停用" },
      },
    ],
    fields: [
      { prop: "name", label: "商品名称" },
      {
        prop: "category",
        label: "分类",
        type: "select",
        options: ["精选", "茶叶", "茶具", "周边"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "points", label: "所需积分", type: "number" },
      { prop: "stock", label: "库存", type: "number" },
      { prop: "limitQty", label: "每人限购数量", type: "number", min: 1 },
      { prop: "stockUnit", label: "库存单位" },
      { prop: "deliveryMethod", label: "配送方式" },
      { prop: "exchangeNotes", label: "兑换说明", type: "textarea" },
      { prop: "imageKey", label: "礼品图片", type: "media" },
      { prop: "status", label: "兑换状态", type: "select", options: onOff },
    ],
  },
  pointsTask: {
    endpoint: "points/tasks",
    title: "积分任务与签到规则",
    singular: "积分任务",
    description:
      "首页四格显示启用且有效的任务中排序最前的四项，其余保留在更多任务。编辑排序即可调整四格内容；同排序按任务ID。签到按上海自然日，完成状态由真实业务判断。",
    activeLabel: "启用任务",
    columns: [
      { prop: "taskCode", label: "任务编码", width: 180 },
      { prop: "taskName", label: "任务名称" },
      { prop: "businessType", label: "业务类型" },
      { prop: "rewardPoints", label: "奖励积分" },
      { prop: "claimCount", label: "领取次数" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "启用", 1: "停用" },
      },
    ],
    fields: [
      { prop: "taskCode", label: "任务编码", readonly: true },
      { prop: "businessType", label: "业务类型", readonly: true },
      { prop: "taskName", label: "任务名称" },
      { prop: "rewardPoints", label: "奖励积分", type: "number", min: 1 },
      { prop: "description", label: "任务说明", type: "textarea" },
      { prop: "startTime", label: "开始时间（可留空）" },
      { prop: "endTime", label: "结束时间（可留空）" },
      { prop: "sortNo", label: "排序", type: "number" },
      { prop: "status", label: "状态", type: "select", options: onOff },
    ],
  },
  pointsLedger: {
    endpoint: "points/ledger",
    title: "积分流水账本",
    singular: "积分流水",
    description:
      "展示不可缺失的变更前余额、变更后余额、业务编号与备注；流水只由业务事务写入。",
    activeLabel: "收入流水",
    columns: [
      { prop: "customerId", label: "会员ID" },
      { prop: "nickname", label: "会员" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "businessType", label: "业务类型", width: 170 },
      { prop: "relatedBusinessNo", label: "业务编号", width: 200 },
      { prop: "amount", label: "变更积分" },
      { prop: "balanceBefore", label: "变更前" },
      { prop: "balanceAfter", label: "变更后" },
      { prop: "remark", label: "备注", width: 240 },
      { prop: "createTime", label: "时间", width: 165 },
    ],
    fields: [],
  },
  pointsAccrual: {
    endpoint: "points/accruals",
    title: "购物积分生效账本",
    singular: "待生效记录",
    description:
      "支付后进入待生效，确认收货或订单完成后转为可用；取消和退款会记录冲正。",
    activeLabel: "待生效记录",
    columns: [
      { prop: "customerId", label: "会员ID" },
      { prop: "nickname", label: "会员" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "orderNo", label: "订单号", width: 200 },
      { prop: "originalPoints", label: "原始积分" },
      { prop: "availablePoints", label: "已生效" },
      { prop: "reversedPoints", label: "已冲正" },
      { prop: "status", label: "状态", tag: true },
      { prop: "effectiveTime", label: "生效时间", width: 165 },
      { prop: "createTime", label: "创建时间", width: 165 },
    ],
    fields: [],
  },
  pointsDebt: {
    endpoint: "points/debts",
    title: "积分待补扣记录",
    singular: "待补扣记录",
    description:
      "退款冲正时余额不足会形成可审计待补扣记录，不会静默形成错误余额。",
    activeLabel: "待补扣记录",
    columns: [
      { prop: "debtNo", label: "记录号", width: 200 },
      { prop: "nickname", label: "会员" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "businessNo", label: "业务编号", width: 200 },
      { prop: "pointsAmount", label: "应补扣" },
      { prop: "settledPoints", label: "已补扣" },
      { prop: "status", label: "状态", tag: true },
      { prop: "reason", label: "原因", width: 280 },
      { prop: "createTime", label: "创建时间", width: 165 },
    ],
    fields: [],
  },
  tierReward: {
    endpoint: "points/tiers",
    title: "阶梯奖励规则",
    singular: "阶梯规则",
    description: "规则调整不改写历史领取快照，用户前端重新加载后实时更新。",
    activeLabel: "启用规则",
    imageProp: "rewardImageKey",
    columns: [
      { prop: "ruleName", label: "规则名称", width: 180 },
      { prop: "metricType", label: "进度指标" },
      { prop: "thresholdValue", label: "门槛" },
      { prop: "rewardName", label: "奖励名称" },
      { prop: "rewardPoints", label: "奖励积分" },
      { prop: "claimCount", label: "领取数" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "启用", 1: "停用" },
      },
    ],
    fields: [
      { prop: "metricType", label: "进度指标", readonly: true },
      { prop: "ruleName", label: "规则名称" },
      { prop: "thresholdValue", label: "门槛", type: "number", min: 1 },
      { prop: "rewardName", label: "奖励名称" },
      { prop: "rewardPoints", label: "奖励积分", type: "number" },
      { prop: "rewardImageKey", label: "奖励图片", type: "media" },
      { prop: "rewardContents", label: "奖励内容", type: "textarea" },
      { prop: "startTime", label: "开始时间（可留空）" },
      { prop: "endTime", label: "结束时间（可留空）" },
      { prop: "sortNo", label: "排序", type: "number" },
      { prop: "status", label: "状态", type: "select", options: onOff },
    ],
  },
  tierClaim: {
    endpoint: "points/tier-claims",
    title: "阶梯奖励领取记录",
    singular: "领取记录",
    description: "记录领取编号、资格快照、奖励快照和积分到账状态。",
    activeLabel: "已领取",
    columns: [
      { prop: "claimNo", label: "领取单号", width: 210 },
      { prop: "nickname", label: "会员" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "ruleName", label: "规则" },
      { prop: "progressSnapshot", label: "进度快照" },
      { prop: "rewardPoints", label: "积分" },
      { prop: "rewardSnapshot", label: "奖励快照", width: 260 },
      { prop: "status", label: "状态", tag: true },
      { prop: "createTime", label: "领取时间", width: 165 },
    ],
    fields: [],
  },
  customer: {
    endpoint: "customers",
    title: "商城会员",
    singular: "商城会员",
    description:
      "查看手机号或微信注册的前台会员。这里与“系统管理－用户管理”的后台管理员账号相互隔离。",
    activeLabel: "正常会员",
    columns: [
      { prop: "id", label: "会员编号", width: 100 },
      { prop: "nickname", label: "客户昵称" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "points", label: "积分余额" },
      { prop: "orderCount", label: "订单数" },
      { prop: "addressCount", label: "地址数" },
      { prop: "loginType", label: "登录方式", width: 120 },
      { prop: "wechatBinding", label: "当前小程序微信绑定", width: 160 },
      { prop: "wechatBoundAt", label: "绑定时间", width: 165 },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "正常", 1: "停用", 3: "测试会员" },
      },
      { prop: "createTime", label: "注册时间", width: 165 },
    ],
    fields: [
      { prop: "id", label: "会员编号", readonly: true },
      { prop: "nickname", label: "客户昵称" },
      {
        prop: "phone",
        label: "手机号（请在用户端安全更换）",
        readonly: true,
      },
      { prop: "loginType", label: "登录方式", readonly: true },
      { prop: "wechatBinding", label: "微信绑定（仅用户本人授权，不允许后台代绑）", readonly: true },
      { prop: "wechatBoundAt", label: "微信绑定时间", readonly: true },
      { prop: "points", label: "当前积分余额", readonly: true },
      {
        prop: "pointsAdjustment",
        label: "本次积分调整（正数增加，负数扣减）",
        type: "number",
        min: -100000,
      },
      { prop: "pointsRemark", label: "调整原因（必填，将写入积分流水）" },
      {
        prop: "status",
        label: "账户状态",
        type: "select",
        options: customerStatusOptions,
      },
    ],
  },
  distributor: {
    endpoint: "distributors",
    title: "分销关系",
    singular: "分销账户",
    description: "查看上下级绑定、待结算佣金、可提现余额和累计提现。",
    activeLabel: "正常分销账户",
    columns: [
      { prop: "nickname", label: "分销客户" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "inviteCode", label: "邀请码" },
      { prop: "parentName", label: "上级客户" },
      { prop: "pending", label: "待结算" },
      { prop: "balance", label: "可提现" },
      { prop: "frozen", label: "审核中" },
      { prop: "withdrawn", label: "已提现" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "正常", 1: "停用" },
      },
    ],
    fields: [],
  },
  inviteRecord: {
    endpoint: "invite-records",
    title: "邀请记录",
    singular: "邀请记录",
    description: "注册绑定、邀请场景和真实首单完成状态使用同一份关系数据。",
    activeLabel: "已完成邀请",
    columns: [
      { prop: "inviterName", label: "邀请人" },
      { prop: "inviterPhone", label: "邀请人手机", width: 130 },
      { prop: "inviteeName", label: "受邀人" },
      { prop: "inviteePhone", label: "受邀人手机", width: 130 },
      { prop: "sceneCode", label: "场景码", width: 230 },
      { prop: "source", label: "来源" },
      { prop: "status", label: "状态", tag: true },
      { prop: "completedOrderNo", label: "完成订单", width: 190 },
      { prop: "createTime", label: "绑定时间", width: 165 },
    ],
    fields: [],
  },
  inviteScene: {
    endpoint: "invite-scenes",
    title: "邀请场景",
    singular: "邀请场景",
    description: "场景码由服务端生成，追踪绑定次数并检查异常使用。",
    activeLabel: "有效场景",
    columns: [
      { prop: "sceneCode", label: "不可猜测场景码", width: 260 },
      { prop: "inviterName", label: "邀请人" },
      { prop: "inviterPhone", label: "手机号", width: 130 },
      { prop: "channel", label: "渠道" },
      { prop: "useCount", label: "使用次数" },
      { prop: "bindCount", label: "有效绑定" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "有效", 1: "停用" },
      },
      { prop: "createTime", label: "创建时间", width: 165 },
    ],
    fields: [],
  },
  inviteGiftRule: {
    endpoint: "invite-gift-rules",
    title: "邀请礼包规则",
    singular: "礼包规则",
    description: "修改达标人数、奖励积分和礼包内容后，用户前端重新加载即同步。",
    activeLabel: "启用规则",
    columns: [
      { prop: "ruleName", label: "规则名称", width: 190 },
      { prop: "requiredCount", label: "达标人数" },
      { prop: "rewardType", label: "奖励类型" },
      { prop: "rewardPoints", label: "奖励积分" },
      { prop: "stock", label: "剩余库存" },
      { prop: "giftValue", label: "礼包价值", money: true },
      { prop: "giftContents", label: "礼包内容", width: 320 },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "启用", 1: "停用" },
      },
    ],
    fields: [
      { prop: "ruleName", label: "规则名称" },
      { prop: "requiredCount", label: "完成邀请人数", type: "number" },
      {
        prop: "rewardType",
        label: "奖励类型",
        type: "select",
        options: [
          { label: "积分", value: "POINTS" },
          { label: "积分奖品", value: "REWARD" },
        ],
      },
      {
        prop: "rewardId",
        label: "关联积分奖品（积分奖励可留空）",
        type: "select",
      },
      { prop: "rewardQty", label: "奖品数量", type: "number", min: 1 },
      { prop: "rewardPoints", label: "奖励积分", type: "number" },
      { prop: "stock", label: "奖励库存", type: "number" },
      { prop: "giftValue", label: "礼包价值", type: "number", precision: 2 },
      {
        prop: "giftContents",
        label: "礼包内容（以 | 分隔）",
        type: "textarea",
      },
      { prop: "startTime", label: "开始时间（可留空）" },
      { prop: "endTime", label: "结束时间（可留空）" },
      { prop: "sortNo", label: "阶梯排序", type: "number" },
      { prop: "status", label: "规则状态", type: "select", options: onOff },
    ],
  },
  inviteGiftClaim: {
    endpoint: "invite-gift-claims",
    title: "礼包领取记录",
    singular: "领取记录",
    description: "领取请求、资格快照、积分发放和人工履约状态均可追溯。",
    activeLabel: "待处理领取",
    columns: [
      { prop: "claimNo", label: "领取单号", width: 210 },
      { prop: "nickname", label: "领取人" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "ruleName", label: "礼包规则" },
      { prop: "completedCount", label: "达标人数" },
      { prop: "rewardPoints", label: "已发积分" },
      { prop: "status", label: "履约状态", tag: true },
      { prop: "claimTime", label: "领取时间", width: 165 },
    ],
    fields: [
      { prop: "claimNo", label: "领取单号", readonly: true },
      { prop: "nickname", label: "领取人", readonly: true },
      {
        prop: "rewardSnapshot",
        label: "奖励快照",
        type: "textarea",
        readonly: true,
      },
      {
        prop: "status",
        label: "处理状态",
        type: "select",
        options: ["已领取", "处理中", "已发放", "异常"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "adminRemark", label: "处理备注", type: "textarea" },
    ],
  },
  commissionLedger: {
    endpoint: "commission/ledger",
    title: "佣金账本",
    singular: "佣金流水",
    description:
      "佣金仅通过订单状态生成、结算和冲正；流水不可直接删除。规则修改不改写历史记录。",
    activeLabel: "账本流水",
    columns: [
      { prop: "ledgerNo", label: "流水号", width: 220 },
      { prop: "nickname", label: "收益人" },
      { prop: "businessType", label: "业务类型" },
      { prop: "amount", label: "变动金额", money: true },
      { prop: "businessNo", label: "业务编号", width: 220 },
      { prop: "remark", label: "审计说明", width: 280 },
      { prop: "createTime", label: "创建时间", width: 165 },
    ],
    fields: [],
  },
  withdrawV2: {
    endpoint: "withdrawals-v2",
    title: "提现申请与审核",
    singular: "提现申请",
    description:
      "按待审核→审核通过→处理中→已完成流转；完成仅表示测试或线下人工确认，不代表微信真实转账。",
    activeLabel: "待处理申请",
    columns: [
      { prop: "withdrawalNo", label: "提现单号", width: 210 },
      { prop: "nickname", label: "客户" },
      { prop: "phone", label: "手机号", width: 130 },
      { prop: "amount", label: "申请金额", money: true },
      { prop: "feeAmount", label: "手续费", money: true },
      { prop: "arrivalAmount", label: "到账金额", money: true },
      { prop: "accountType", label: "方式" },
      { prop: "status", label: "状态", tag: true },
      { prop: "createTime", label: "申请时间", width: 165 },
    ],
    fields: [
      { prop: "withdrawalNo", label: "提现单号", readonly: true },
      { prop: "nickname", label: "客户", readonly: true },
      { prop: "amount", label: "申请金额", readonly: true },
      {
        prop: "status",
        label: "下一状态",
        type: "select",
        options: ["审核通过", "处理中", "已完成", "已驳回"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "opinion", label: "审核意见（必填）", type: "textarea" },
    ],
  },
  couponTemplate: {
    endpoint: "coupon/templates",
    title: "优惠券模板",
    singular: "优惠券模板",
    description:
      "模板、用户券、锁定、核销和释放全部由服务端记录；停用模板不删除历史核销记录。",
    activeLabel: "优惠券模板",
    columns: [
      { prop: "templateNo", label: "模板编号", width: 190 },
      { prop: "name", label: "名称", width: 160 },
      { prop: "couponType", label: "类型" },
      { prop: "discountAmount", label: "优惠金额", money: true },
      { prop: "minOrderAmount", label: "门槛", money: true },
      { prop: "scopeType", label: "适用范围" },
      { prop: "issuedQty", label: "已发放" },
      { prop: "totalQty", label: "总量" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "启用", 1: "停用" },
      },
    ],
    fields: [
      { prop: "name", label: "优惠券名称" },
      {
        prop: "couponType",
        label: "类型",
        type: "select",
        options: ["满减券", "固定金额券"].map((value) => ({
          label: value,
          value,
        })),
      },
      {
        prop: "discountAmount",
        label: "优惠金额",
        type: "number",
        precision: 2,
      },
      {
        prop: "minOrderAmount",
        label: "使用门槛",
        type: "number",
        precision: 2,
      },
      { prop: "validFrom", label: "生效时间" },
      { prop: "validTo", label: "失效时间" },
      {
        prop: "scopeType",
        label: "适用范围",
        type: "select",
        options: ["全场", "指定商品", "指定分类"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "scopeValue", label: "适用商品 / 分类", type: "select", multiple: true },
      { prop: "totalQty", label: "发放总量", type: "number" },
      { prop: "perUserLimit", label: "每人限领", type: "number" },
      { prop: "description", label: "使用说明", type: "textarea" },
      { prop: "status", label: "状态", type: "select", options: onOff },
    ],
  },
  supportContent: {
    endpoint: "support/documents",
    title: "协议、隐私与FAQ",
    singular: "可管理内容",
    description:
      "登录页、设置页和客服页从同一份后台内容读取；工单仍在客服工单模块处理。",
    activeLabel: "已发布内容",
    columns: [
      { prop: "documentKey", label: "内容键", width: 180 },
      { prop: "title", label: "标题", width: 180 },
      { prop: "version", label: "版本" },
      { prop: "sortNo", label: "排序" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "发布", 1: "停用" },
      },
      { prop: "updateTime", label: "更新时间", width: 165 },
    ],
    fields: [
      { prop: "documentKey", label: "内容键", readonly: true },
      { prop: "title", label: "标题" },
      { prop: "content", label: "正文", type: "textarea" },
      { prop: "version", label: "版本" },
      { prop: "sortNo", label: "排序", type: "number" },
      { prop: "status", label: "状态", type: "select", options: onOff },
    ],
  },
  withdrawal: {
    endpoint: "withdrawals",
    title: "佣金提现",
    singular: "提现申请",
    description: "统一提现审核：待审核→审核通过→处理中→已完成；退款欠扣禁止继续提现，完成前可驳回。完成仅表示测试或线下人工确认，非微信真实转账。",
    activeLabel: "待审核申请",
    columns: [
      { prop: "withdrawalNo", label: "提现单号", width: 190 },
      { prop: "nickname", label: "客户" },
      { prop: "amount", label: "提现金额", money: true },
      { prop: "accountType", label: "渠道" },
      { prop: "accountNo", label: "收款账号", width: 180 },
      { prop: "status", label: "状态", tag: true },
      { prop: "createTime", label: "申请时间", width: 165 },
    ],
    fields: [
      { prop: "withdrawalNo", label: "提现单号", readonly: true },
      { prop: "nickname", label: "申请客户", readonly: true },
      { prop: "amount", label: "提现金额", readonly: true },
      { prop: "accountType", label: "收款渠道", readonly: true },
      { prop: "accountNo", label: "收款账号", readonly: true },
      {
        prop: "status",
        label: "审核结果",
        type: "select",
        options: ["审核通过", "处理中", "已完成", "已驳回"].map((value) => ({ label: value, value })),
      },
      { prop: "opinion", label: "审核意见（必填）", type: "textarea" },
    ],
  },
  ticket: {
    endpoint: "tickets",
    title: "客服工单",
    singular: "客服工单",
    description: "处理移动端在线客服提交的问题，并把回复实时同步给客户。",
    activeLabel: "待处理工单",
    columns: [
      { prop: "ticketNo", label: "工单号", width: 190 },
      { prop: "nickname", label: "客户" },
      { prop: "phone", label: "会员手机", width: 130 },
      { prop: "category", label: "问题类型" },
      { prop: "content", label: "问题描述", width: 260 },
      { prop: "contact", label: "联系方式", width: 160 },
      { prop: "status", label: "状态", tag: true },
      { prop: "createTime", label: "提交时间", width: 165 },
    ],
    fields: [
      { prop: "ticketNo", label: "工单号", readonly: true },
      { prop: "nickname", label: "客户", readonly: true },
      { prop: "content", label: "问题描述", type: "textarea", readonly: true },
      { prop: "contact", label: "客户联系方式", readonly: true },
      {
        prop: "status",
        label: "处理状态",
        type: "select",
        options: ["待处理", "处理中", "已回复", "已完成"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "reply", label: "客服回复", type: "textarea" },
    ],
  },
  exchange: {
    endpoint: "exchanges",
    title: "积分兑换履约",
    singular: "积分兑换单",
    description: "兑换记录、扣减积分、收货地址和礼品物流使用同一份实时数据。",
    activeLabel: "待发货兑换单",
    columns: [
      { prop: "exchangeNo", label: "兑换单号", width: 190 },
      { prop: "nickname", label: "客户" },
      { prop: "name", label: "礼品" },
      { prop: "qty", label: "数量" },
      { prop: "pointsCost", label: "扣减积分" },
      { prop: "receiverName", label: "收货人" },
      { prop: "receiverPhone", label: "手机号", width: 130 },
      { prop: "receiverAddress", label: "完整地址", width: 260 },
      { prop: "status", label: "状态", tag: true },
      { prop: "trackingNo", label: "物流单号", width: 170 },
    ],
    fields: [
      { prop: "exchangeNo", label: "兑换单号", readonly: true },
      { prop: "name", label: "礼品", readonly: true },
      { prop: "receiverName", label: "收货人", readonly: true },
      { prop: "receiverPhone", label: "手机号", readonly: true },
      {
        prop: "receiverAddress",
        label: "完整地址",
        type: "textarea",
        readonly: true,
      },
      {
        prop: "status",
        label: "履约状态",
        type: "select",
        options: ["待处理", "待发货", "配送中", "已完成", "已取消"].map(
          (value) => ({ label: value, value }),
        ),
      },
      { prop: "carrier", label: "物流公司" },
      { prop: "trackingNo", label: "物流单号" },
    ],
  },
  review: {
    endpoint: "reviews",
    title: "商品评价",
    singular: "商品评价",
    description: "仅展示已完成订单产生的真实购买评价。",
    activeLabel: "公开评价",
    columns: [
      { prop: "orderNo", label: "订单号", width: 190 },
      { prop: "productName", label: "商品", width: 190 },
      { prop: "nickname", label: "客户" },
      { prop: "rating", label: "评分" },
      { prop: "content", label: "评价内容", width: 320 },
      { prop: "createTime", label: "评价时间", width: 165 },
    ],
    fields: [],
  },
  partnerApplication: {
    endpoint: "partner/applications",
    title: "合伙人申请",
    singular: "合伙人申请",
    description: "审核状态机保留全部历史记录，只有待审核申请可以通过或驳回。",
    activeLabel: "待审核申请",
    columns: [
      { prop: "application_no", label: "申请单号", width: 210 },
      { prop: "nickname", label: "申请人" },
      { prop: "real_name", label: "真实姓名" },
      { prop: "phone", label: "联系电话", width: 130 },
      { prop: "region", label: "地区" },
      { prop: "status", label: "审核状态", tag: true },
      { prop: "reject_reason", label: "审核原因", width: 220 },
      { prop: "submitted_time", label: "提交时间", width: 165 },
    ],
    fields: [
      { prop: "application_no", label: "申请单号", readonly: true },
      { prop: "real_name", label: "真实姓名", readonly: true },
      { prop: "id_no", label: "身份证号", readonly: true },
      { prop: "region", label: "所在地区", readonly: true },
      { prop: "address", label: "详细地址", type: "textarea", readonly: true },
      { prop: "phone", label: "联系电话", readonly: true },
      {
        prop: "application_reason",
        label: "申请理由",
        type: "textarea",
        readonly: true,
      },
      { prop: "agreement_version", label: "协议版本", readonly: true },
      {
        prop: "status",
        label: "审核结果",
        type: "select",
        options: [
          { label: "审核通过", value: "审核通过" },
          { label: "审核驳回", value: "审核驳回" },
        ],
      },
      { prop: "reason", label: "审核说明（驳回必填）", type: "textarea" },
    ],
  },
  contentCategory: {
    endpoint: "content/categories",
    title: "内容分类",
    singular: "内容分类",
    description: "分类上下架实时控制前台文章是否可访问。",
    activeLabel: "启用分类",
    columns: [
      { prop: "categoryCode", label: "分类编码" },
      { prop: "categoryName", label: "分类名称" },
      { prop: "parentId", label: "父分类ID" },
      { prop: "sortNo", label: "排序" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "启用", 1: "停用" },
      },
    ],
    fields: [
      { prop: "categoryCode", label: "分类编码" },
      { prop: "categoryName", label: "分类名称" },
      { prop: "parentId", label: "父分类", type: "select" },
      { prop: "description", label: "分类说明", type: "textarea" },
      { prop: "sortNo", label: "排序", type: "number" },
      { prop: "status", label: "状态", type: "select", options: onOff },
    ],
  },
  contentArticle: {
    endpoint: "content/articles",
    imageProp: "coverImageKey",
    title: "内容文章",
    singular: "内容文章",
    description: "正文经过服务端安全过滤，推荐商品只展示真实在售商品。",
    activeLabel: "已发布文章",
    columns: [
      { prop: "title", label: "标题", width: 220 },
      { prop: "categoryName", label: "分类" },
      { prop: "slug", label: "路由标识", width: 180 },
      { prop: "favoriteCount", label: "收藏" },
      { prop: "viewCount", label: "浏览" },
      {
        prop: "status",
        label: "状态",
        tag: true,
        map: { 0: "已发布", 1: "下架" },
      },
    ],
    fields: [
      { prop: "categoryId", label: "文章分类", type: "select" },
      { prop: "slug", label: "文章标识" },
      { prop: "title", label: "标题" },
      { prop: "summary", label: "摘要", type: "textarea" },
      { prop: "coverImageKey", label: "封面", type: "media" },
      {
        prop: "bodyHtml",
        label: "正文 HTML（保存时安全过滤）",
        type: "textarea",
      },
      { prop: "productIds", label: "关联商品", type: "select", multiple: true },
      { prop: "sortNo", label: "排序", type: "number" },
      {
        prop: "status",
        label: "发布状态",
        type: "select",
        options: [
          { label: "已发布", value: "0" },
          { label: "下架", value: "1" },
        ],
      },
    ],
  },
  communityPost: {
    endpoint: "community/posts",
    title: "社区动态",
    singular: "社区动态",
    description: "审核用户发布的真实动态，隐藏或删除后前台立即不可见。",
    activeLabel: "正常动态",
    columns: [
      { prop: "nickname", label: "发布人" },
      { prop: "content", label: "内容", width: 320 },
      { prop: "likeCount", label: "点赞" },
      { prop: "commentCount", label: "评论" },
      { prop: "status", label: "状态", tag: true },
      { prop: "createTime", label: "发布时间", width: 165 },
    ],
    fields: [
      { prop: "content", label: "动态内容", type: "textarea", readonly: true },
      {
        prop: "status",
        label: "审核状态",
        type: "select",
        options: ["正常", "待审核", "隐藏", "已删除"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "remark", label: "审核备注", type: "textarea" },
    ],
  },
  communityComment: {
    endpoint: "community/comments",
    title: "社区评论",
    singular: "社区评论",
    description: "评论审核、点赞和举报数据都来自数据库并保留操作记录。",
    activeLabel: "正常评论",
    columns: [
      { prop: "postId", label: "动态ID" },
      { prop: "nickname", label: "评论人" },
      { prop: "content", label: "评论内容", width: 340 },
      { prop: "status", label: "状态", tag: true },
      { prop: "createTime", label: "评论时间", width: 165 },
    ],
    fields: [
      { prop: "content", label: "评论内容", type: "textarea", readonly: true },
      {
        prop: "status",
        label: "审核状态",
        type: "select",
        options: ["正常", "待审核", "隐藏", "已删除"].map((value) => ({
          label: value,
          value,
        })),
      },
      { prop: "remark", label: "审核备注", type: "textarea" },
    ],
  },
};

const config = computed(() => configs[props.mode]);
const permissionPrefix = {
  product: "product", category: "category", topic: "topic", store: "store", sku: "sku",
  order: "order", aftersale: "aftersale", notification: "notification", reward: "reward",
  pointsTask: "points-task", pointsLedger: "points-ledger", pointsAccrual: "points-ledger",
  pointsDebt: "points-ledger", tierReward: "tier-reward", tierClaim: "tier-reward",
  customer: "customer", distributor: "distribution", inviteRecord: "invite",
  inviteScene: "invite-scene", inviteGiftRule: "invite-gift", inviteGiftClaim: "invite-gift",
  commissionLedger: "commission-ledger", withdrawV2: "withdraw-config", couponTemplate: "coupon",
  supportContent: "support", withdrawal: "withdrawal", ticket: "ticket", exchange: "exchange",
  review: "review", partnerApplication: "partner", contentCategory: "content-category",
  contentArticle: "content-article", communityPost: "community-post", communityComment: "community-comment",
};
const permissions = computed(() => {
  const prefix = permissionPrefix[props.mode] || props.mode;
  return {
    list: `mall:${prefix}:list`,
    edit: `mall:${prefix}:edit`,
    remove: `mall:${prefix}:remove`,
  };
});
const canCreate = computed(() =>
  [
    "product",
    "category",
    "topic",
    "store",
    "sku",
    "notification",
    "reward",
    "inviteGiftRule",
    "contentCategory",
    "contentArticle",
  ].includes(props.mode),
);
const canDelete = computed(() =>
  ["product", "category", "topic", "store", "sku", "notification"].includes(
    props.mode,
  ),
);
const rows = ref([]);
const keyword = ref("");
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const form = ref({});
const updatedAt = ref("—");
const productCategories = ref([]);
const relatedProducts = ref([]);
const contentCategories = ref([]);
const relatedRewards = ref([]);

const productCategoryOptions = computed(() => {
  const parentIds = new Set(productCategories.value.map((item) => Number(item.parentId)).filter(Boolean));
  return productCategories.value
    .filter((item) => item.status === "0" && !parentIds.has(Number(item.id)))
    .map((item) => ({ value: Number(item.id), label: item.name }));
});

const filteredRows = computed(() => {
  const value = keyword.value.trim().toLowerCase();
  if (!value) return rows.value;
  return rows.value.filter((row) =>
    Object.values(row).some((cell) =>
      String(cell ?? "")
        .toLowerCase()
        .includes(value),
    ),
  );
});

const currentPage = ref(1);
const pageSize = ref(20);
const pagedRows = computed(() => filteredRows.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value));
watch([keyword, pageSize], () => { currentPage.value = 1; });
watch(() => filteredRows.value.length, (total) => {
  currentPage.value = Math.min(currentPage.value, Math.max(1, Math.ceil(total / pageSize.value)));
});

const activeCount = computed(
  () =>
    rows.value.filter((row) => {
      if (props.mode === "order")
        return !["已完成", "已取消"].includes(row.status);
      if (props.mode === "aftersale")
        return !["审核拒绝", "用户已撤销", "已关闭", "售后完成"].includes(row.status);
      if (props.mode === "withdrawal") return row.status === "待审核";
      if (props.mode === "ticket")
        return ["待处理", "处理中"].includes(row.status);
      if (props.mode === "exchange")
        return ["待处理", "待发货", "配送中"].includes(row.status);
      if (props.mode === "pointsLedger") return Number(row.amount) > 0;
      if (props.mode === "review") return row.status === "0";
      if (props.mode === "notification") return Number(row.readStatus) === 0;
      if (props.mode === "inviteRecord") return row.status === "已完成";
      if (props.mode === "inviteGiftClaim")
        return ["已领取", "处理中"].includes(row.status);
      return row.status === "0";
    }).length,
);

function displayValue(value, column) {
  if (column.map) return column.map[value] ?? value;
  return value === null || value === undefined || value === "" ? "—" : value;
}

function tagType(value) {
  if (["0", "已完成", "已同意", "已打款", "正常"].includes(String(value)))
    return "success";
  if (
    [
      "待支付",
      "待付款",
      "待发货",
      "待收货",
      "待审核",
      "处理中",
      "售后中",
    ].includes(String(value))
  )
    return "warning";
  if (["1", "已拒绝", "已取消"].includes(String(value))) return "danger";
  return "info";
}

function imageUrl(key) {
  const files = {
    "longjing-pale": "longjing-hero-v2.webp",
    "longjing-dark": "longjing-dark-v2.webp",
    "tea-gift": "tea-gift-v2.webp",
    biluochun: "biluochun.jpg",
    "blacktea-red": "blacktea-red.jpg",
    "blacktea-orange": "blacktea-orange.jpg",
    "maofeng-pouch": "maofeng-pouch.jpg",
    "yixing-pot": "yixing-pot.jpg",
    "porcelain-cup": "porcelain-cup.jpg",
    "travel-set": "travel-set.jpg",
    "canvas-tote": "canvas-tote.jpg",
    "wood-tray": "wood-tray.jpg",
  };
  if (!key) return "";
  if (/^https?:\/\//i.test(key)) return key;
  if (String(key).startsWith("/profile/")) return `${baseUrl}${key}`;
  if (String(key).startsWith("/static/")) return `https://chaye.okam.top${key}`;
  if (String(key).startsWith("/")) return key;
  return files[key] ? `https://chaye.okam.top/static/images/${files[key]}` : "";
}

async function load() {
  loading.value = true;
  try {
    const needsProducts = ["sku", "topic", "contentArticle", "couponTemplate"].includes(props.mode);
    const needsMallCategories = ["product", "category", "couponTemplate"].includes(props.mode);
    const needsContentCategories = ["contentCategory", "contentArticle"].includes(props.mode);
    const [response, categoryResponse, productResponse, contentCategoryResponse, rewardResponse] = await Promise.all([
      listMall(config.value.endpoint),
      needsMallCategories ? listMall("categories") : Promise.resolve({ data: [] }),
      needsProducts ? listMall("products") : Promise.resolve({ data: [] }),
      needsContentCategories ? listMall("content/categories") : Promise.resolve({ data: [] }),
      props.mode === "inviteGiftRule" ? listMall("rewards") : Promise.resolve({ data: [] }),
    ]);
    rows.value = response.data || [];
    productCategories.value = categoryResponse.data || [];
    relatedProducts.value = productResponse.data || [];
    contentCategories.value = contentCategoryResponse.data || [];
    relatedRewards.value = rewardResponse.data || [];
    updatedAt.value = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } finally {
    loading.value = false;
  }
}

function openEdit(row) {
  form.value = {
    ...row,
    __originalStatus: row.status,
    galleryImages: normalizeGallery(row.galleryImages),
    detailImages: normalizeGallery(row.detailImages),
  };
  if (props.mode === "customer") {
    form.value.pointsAdjustment = 0;
    form.value.pointsRemark = "";
  }
  if (["topic", "contentArticle"].includes(props.mode)) {
    form.value.productIds = normalizeIdList(row.productIds);
  }
  if (props.mode === "couponTemplate") {
    form.value.scopeValue = String(row.scopeValue || "")
      .split(/[,，]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => row.scopeType === "指定商品" ? Number(item) : item)
      .filter((item) => row.scopeType !== "指定商品" || Number.isFinite(item));
  }
  if (props.mode === "partnerApplication") form.value.reason = "";
  dialogOpen.value = true;
}

function fieldOptions(field) {
  if (field.type !== "select") return [];
  if (props.mode === "product" && field.prop === "categoryId")
    return productCategoryOptions.value;
  if (props.mode === "category" && field.prop === "parentId")
    return [{ value: null, label: "茶叶 / 茶具根分类" }, ...productCategories.value
      .filter((item) => Number(item.id) !== Number(form.value.id) && !item.parentId)
      .map((item) => ({ value: Number(item.id), label: item.name }))];
  if (field.prop === "productId")
    return relatedProducts.value.map((item) => ({
      value: Number(item.id),
      label: `${item.name} · ${item.spec || "默认规格"}`,
    }));
  if (field.prop === "productIds")
    return relatedProducts.value.map((item) => ({ value: Number(item.id), label: item.name }));
  if (props.mode === "contentArticle" && field.prop === "categoryId")
    return contentCategories.value
      .filter((item) => item.status === "0")
      .map((item) => ({ value: Number(item.id), label: item.categoryName }));
  if (props.mode === "contentCategory" && field.prop === "parentId")
    return [{ value: null, label: "根分类" }, ...contentCategories.value
      .filter((item) => Number(item.id) !== Number(form.value.id))
      .map((item) => ({ value: Number(item.id), label: item.categoryName }))];
  if (props.mode === "inviteGiftRule" && field.prop === "rewardId")
    return relatedRewards.value
      .filter((item) => item.status === "0")
      .map((item) => ({ value: Number(item.id), label: `${item.name} · ${item.points}积分` }));
  if (props.mode === "couponTemplate" && field.prop === "scopeValue") {
    if (form.value.scopeType === "指定商品")
      return relatedProducts.value.map((item) => ({ value: Number(item.id), label: item.name }));
    if (form.value.scopeType === "指定分类")
      return productCategories.value
        .filter((item) => item.parentId && item.status === "0")
        .map((item) => ({ value: item.name, label: item.name }));
    return [];
  }
  if (field.prop !== "status") return field.options || [];
  const current = String(
    form.value.__originalStatus ?? form.value.status ?? "",
  );
  if (props.mode === "order") {
    const transitions = {
      待付款: ["待付款", "已取消"],
      待发货: ["待发货", "待收货"],
      待收货: ["待收货", "已完成"],
      已完成: ["已完成"],
      售后中: ["售后中"],
      部分售后完成: ["部分售后完成"],
      已退款: ["已退款"],
      已取消: ["已取消"],
      已关闭: ["已关闭"],
    };
    return (transitions[current] || [current]).map((value) => ({
      label: value,
      value,
    }));
  }
  if (props.mode === "aftersale") {
    const type = String(form.value.typeName || "");
    const transitions = {
      申请中: type === "仅退款"
        ? ["申请中", "退款处理中", "审核拒绝", "已关闭"]
        : ["申请中", "等待用户退货", "审核拒绝", "已关闭"],
      等待用户退货: ["等待用户退货", "已关闭"],
      退货运输中: ["退货运输中", "商家已收货"],
      商家已收货: type === "换货"
        ? ["商家已收货", "换货已发出"]
        : ["商家已收货", "退款处理中"],
      退款处理中: ["退款处理中", "退款成功"],
      退款成功: ["退款成功", "售后完成"],
      换货已发出: ["换货已发出"],
      审核拒绝: ["审核拒绝"],
      用户已撤销: ["用户已撤销"],
      已关闭: ["已关闭"],
      售后完成: ["售后完成"],
    };
    return (transitions[current] || [current]).map((value) => ({
      label: value,
      value,
    }));
  }
  if (props.mode === "exchange") {
    const transitions = {
      待处理: ["待处理", "待发货", "已取消"],
      待发货: ["待发货", "配送中", "已取消"],
      配送中: ["配送中"],
      已完成: ["已完成"],
      已取消: ["已取消"],
    };
    return (transitions[current] || [current]).map((value) => ({
      label: value,
      value,
    }));
  }
  return field.options || [];
}

function openCreate() {
  const defaults = {
    product: {
      storeId: 1,
      categoryId: productCategoryOptions.value[0]?.value ?? null,
      name: "",
      shortName: "",
      spec: "100g",
      price: 0,
      reward: 0,
      stock: 0,
      imageKey: "",
      galleryImages: [],
      detailImages: [],
      origin: "",
      gradeName: "",
      rawMaterial: "",
      shelfLife: "18个月",
      brewGuide: "",
      batchNo: "",
      traceabilityInfo: "",
      description: "",
      status: "0",
    },
    category: {
      name: "",
      categoryCode: "",
      categoryGroup: "TEA",
      parentId: null,
      iconUrl: "",
      sortNo: 0,
      status: "0",
    },
    topic: {
      slug: "",
      title: "",
      kicker: "",
      subtitle: "",
      heroImageUrl: "",
      storyImageUrl: "",
      storyTitle: "",
      storyContent: "",
      productIds: [],
      startTime: "",
      endTime: "",
      sortNo: 0,
      status: "0",
    },
    store: {
      name: "",
      logoUrl: "",
      heroImageUrl: "",
      rating: 5,
      followerCount: 0,
      story: "",
      shippingPromise: "顺丰包邮",
      servicePromise: "无忧售后",
      status: "0",
    },
    sku: {
      productId: null,
      productName: "",
      skuCode: "",
      spec: "",
      price: 0,
      stock: 0,
      isDefault: 0,
      status: "0",
    },
    reward: {
      name: "",
      category: "精选",
      points: 1,
      stock: 0,
      limitQty: 1,
      stockUnit: "件",
      imageKey: "",
      exchangeNotes: "兑换成功后由仓库安排发货",
      deliveryMethod: "快递配送",
      status: "0",
    },
    inviteGiftRule: {
      ruleName: "",
      requiredCount: 1,
      rewardType: "POINTS",
      rewardId: null,
      rewardQty: 1,
      rewardPoints: 0,
      stock: 0,
      giftValue: 0,
      giftContents: "",
      startTime: "",
      endTime: "",
      sortNo: 0,
      status: "0",
    },
    contentCategory: {
      categoryCode: "",
      categoryName: "",
      parentId: null,
      description: "",
      sortNo: 0,
      status: "0",
    },
    contentArticle: {
      categoryId: contentCategories.value.find((item) => item.status === "0")?.id ?? null,
      slug: "",
      title: "",
      summary: "",
      coverImageKey: "",
      bodyHtml: "",
      productIds: [],
      sortNo: 0,
      status: "0",
    },
    couponTemplate: {
      name: "",
      couponType: "满减券",
      discountAmount: 0,
      minOrderAmount: 0,
      validFrom: "",
      validTo: "",
      scopeType: "全场",
      scopeValue: [],
      totalQty: 0,
      perUserLimit: 1,
      description: "",
      status: "0",
    },
  };
  form.value = { ...(defaults[props.mode] || {}) };
  dialogOpen.value = true;
}

function normalizeGallery(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeIdList(value) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => Number(item.trim()))
    .filter(Number.isFinite);
}

function uploadedPath(response) {
  if (response?.code !== 200) {
    proxy.$modal.msgError(response?.msg || "图片上传失败");
    return "";
  }
  return response.fileName || response.url || "";
}

function handleMainUpload(field, response) {
  const path = uploadedPath(response);
  if (path) form.value[field] = path;
}

function handleMediaListUpload(field, response) {
  const path = uploadedPath(response);
  if (!path) return;
  form.value[field] = [...new Set([...(form.value[field] || []), path])];
}

function removeMediaListImage(field, index) {
  form.value[field].splice(index, 1);
}

function moveMediaListImage(field, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= form.value[field].length) return;
  const items = [...form.value[field]];
  [items[index], items[target]] = [items[target], items[index]];
  form.value[field] = items;
}

async function removeRow(row) {
  try {
    const label = row.name || row.title || row.spec || row.skuCode || row.id;
    await proxy.$modal.confirm(
      `确定删除“${label}”吗？存在业务引用时系统会拒绝删除。`,
    );
    await deleteMall(config.value.endpoint, row.id);
    proxy.$modal.msgSuccess(`${config.value.singular}已删除并同步三端`);
    await load();
  } catch (error) {
    if (error !== "cancel") throw error;
  }
}

async function save() {
  saving.value = true;
  try {
    if (props.mode === "product")
      form.value.reward = Math.floor(Number(form.value.price || 0) * 10);
    const requiresActionRequest =
      form.value.id && ["order", "aftersale", "ticket"].includes(props.mode);
    let payloadBase = ["topic", "contentArticle"].includes(props.mode)
      ? { ...form.value, productIds: normalizeIdList(form.value.productIds).join(",") }
      : form.value;
    if (props.mode === "couponTemplate") {
      payloadBase = {
        ...form.value,
        scopeValue: form.value.scopeType === "全场"
          ? ""
          : (Array.isArray(form.value.scopeValue) ? form.value.scopeValue : []).join(","),
      };
    }
    const payload = requiresActionRequest
      ? {
          ...payloadBase,
          requestNo: `admin-${props.mode}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        }
      : payloadBase;
    if (form.value.id)
      await updateMall(config.value.endpoint, form.value.id, payload);
    else await createMall(config.value.endpoint, payload);
    proxy.$modal.msgSuccess(
      form.value.id
        ? "保存成功，商城前台已同步"
        : `${config.value.singular}新增成功，已同步三端`,
    );
    dialogOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

watch(() => props.mode, load);
load();
</script>

<style scoped lang="scss">
.mall-manager {
  min-height: calc(100vh - 84px);
  padding: 24px;
  background: #f5f6f7;
  color: #18201b;
}
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 24px;
  border: 1px solid #e3e7e4;
  border-radius: 12px;
  color: #18201b;
  background: #fff;
  box-shadow: none;
}
.eyebrow {
  color: #245b3d;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
}
.page-head h1 {
  margin: 6px 0 4px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.35;
}
.page-head p {
  margin: 0;
  color: #68736b;
  font-size: 14px;
  line-height: 1.6;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.head-actions :deep(.el-input) {
  width: 280px;
}
.head-actions :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px #dfe4e0 inset;
}
.summary-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 16px 0;
}
.summary-row > div {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid #e3e7e4;
  border-radius: 12px;
  background: #fff;
}
.summary-row strong {
  color: #245b3d;
  font-size: 22px;
  font-weight: 600;
}
.summary-row span {
  color: #707a73;
  font-size: 14px;
}
.table-card {
  padding: 16px;
  border: 1px solid #e3e7e4;
  border-radius: 12px;
  background: #fff;
  box-shadow: none;
  overflow: hidden;
}
.product-image {
  width: 52px;
  height: 52px;
  border-radius: 10px;
}
.image-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #28735a;
  background: #e8f4ef;
  font-weight: 600;
}
.money {
  color: #a94f2d;
  font-weight: 600;
}
.edit-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.edit-form :deep(.el-form-item:has(textarea)) {
  grid-column: 1 / -1;
}
.image-preview-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 14px;
  border: 1px solid #e3e7e4;
  border-radius: 12px;
  color: #68736b;
  background: #f8f9f8;
  font-size: 14px;
}
.image-preview-row .el-image {
  width: 88px;
  height: 72px;
  border-radius: 10px;
}
.media-uploader {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  color: #68736b;
  font-size: 14px;
  line-height: 1.6;
}
.operation-timeline {
  grid-column: 1 / -1;
  padding: 18px 20px 4px;
  border: 1px solid #e5e9e6;
  border-radius: 12px;
  background: #f8faf8;
}
.operation-timeline h3 {
  margin: 0 0 18px;
  color: #1c5037;
}
.operation-timeline p {
  margin: 6px 0 0;
  color: #667069;
  line-height: 1.6;
}
.gallery-uploader {
  width: 100%;
}
.gallery-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
}
.gallery-item {
  position: relative;
  width: 92px;
  height: 74px;
  overflow: visible;
  border-radius: 10px;
}
.gallery-item .el-image {
  width: 100%;
  height: 100%;
  border-radius: 10px;
}
.gallery-actions {
  position: absolute;
  right: -8px;
  top: -8px;
  display: flex;
  gap: 3px;
}
.gallery-actions .el-button {
  margin: 0;
}
@media (max-width: 900px) {
  .mall-manager {
    padding: 16px;
  }
  .page-head {
    align-items: stretch;
    flex-direction: column;
  }
  .head-actions {
    min-width: 0;
    flex-wrap: wrap;
  }
  .head-actions :deep(.el-input) {
    width: 100%;
  }
  .summary-row {
    grid-template-columns: 1fr;
  }
  .table-card {
    padding: 8px;
  }
}
@media (max-width: 700px) {
  .edit-form {
    grid-template-columns: 1fr;
  }
  .edit-form :deep(.el-form-item) {
    grid-column: 1 / -1;
  }
  .gallery-item {
    width: 80px;
    height: 68px;
  }
}
</style>
