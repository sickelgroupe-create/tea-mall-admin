<template>
  <div class="app-container friend-admin" v-loading="loading">
    <div class="friend-admin-heading">
      <div>
        <small>TEA MALL</small>
        <h2>茶友邀请与兑换</h2>
        <p>直属好友注册并购买试喝礼包后计入邀请分，与购物积分分开。</p>
      </div>
      <el-button @click="load">刷新数据</el-button>
    </div>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
    <el-tabs v-model="tab">
      <el-tab-pane label="月度前十名奖励" name="monthly"><MonthlyRewards /></el-tab-pane>
      <el-tab-pane label="邀请规则与礼包" name="rules">
        <el-alert v-if="!form.trialProductIds?.length" title="尚未配置试喝礼包：当前新订单无法满足邀请计分门槛。请选择真实参与商品并保存；系统不会自动选商品或补发分值。" type="warning" :closable="false" show-icon />
        <el-card shadow="never">
          <el-form label-position="top" :model="form">
            <el-divider content-position="left">邀请卡片文案（H5与小程序同步）</el-divider>
            <el-form-item label="邀请卡片标题"><el-input v-model="form.inviteCardTitle" maxlength="60" show-word-limit /></el-form-item>
            <div class="friend-form-grid">
              <el-form-item label="奖励数字前文案"><el-input v-model="form.rewardPrefix" maxlength="20" show-word-limit /></el-form-item>
              <el-form-item label="邀请分显示名称"><el-input v-model="form.scoreUnitLabel" maxlength="12" show-word-limit /></el-form-item>
              <el-form-item label="邀请按钮文字"><el-input v-model="form.inviteButtonText" maxlength="12" show-word-limit /></el-form-item>
            </div>
            <el-alert title="文案不改变注册并购买试喝礼包的计分门槛，也不改变资产类型。保存规则后，两端重新进入页面读取新文案。" type="info" :closable="false" />
            <el-divider content-position="left">计分规则与试喝礼包</el-divider>
            <div class="friend-form-grid">
              <el-form-item label="每位有效好友的邀请分"
                ><el-input-number
                  v-model="form.pointsPerFriend"
                  :min="0.01"
                  :max="999999"
                  :precision="2"
                  :step="0.5"
              /></el-form-item>
              <el-form-item label="首页每栏展示商品数"
                ><el-input-number
                  v-model="form.homeItemLimit"
                  :min="1"
                  :max="30"
              /></el-form-item>
              <el-form-item label="大额兑换邀请分阈值（空值全部审核）"
                ><el-input-number
                  v-model="form.largeExchangeScore"
                  :min="0.01"
                  :max="999999"
                  :precision="2"
              /></el-form-item>
              <el-form-item label="每日兑换次数阈值（空值全部审核）"
                ><el-input-number
                  v-model="form.dailyExchangeLimit"
                  :min="1"
                  :max="10000"
                  :precision="0"
              /></el-form-item>
            </div>
            <el-form-item
              label="试喝礼包商品（复用现有商品与SKU，后续新订单保存资格快照）"
            >
              <el-select
                v-model="form.trialProductIds"
                multiple
                filterable
                clearable
                placeholder="请选择参与门槛的商品"
                style="width: 100%"
              >
                <el-option
                  v-for="p in data.products"
                  :key="p.id"
                  :label="p.name + (p.status === '0' ? '' : '（已下架）')"
                  :value="Number(p.id)"
                />
              </el-select>
            </el-form-item>
            <el-alert v-if="form.monthlyRewardText" :title="'历史奖励说明（仅存档）：' + form.monthlyRewardText" type="info" :closable="false" />
            <el-alert title="说明中的邀请分金额自动以实际奖励配置为准。可使用 {pointsPerFriend} 和 {scoreUnitLabel}；历史数字不会覆盖真实计分规则。" type="info" :closable="false" />
            <el-form-item label="邀请及分享页说明（同步H5与小程序）"
              ><el-input
                v-model="form.description"
                type="textarea"
                maxlength="500"
                show-word-limit
            /></el-form-item>
            <el-alert
              title="每位好友只计一次；改分值不追溯重算已入账分值。礼包退款会冲正，余额不足记为待补扣。大额或频繁兑换时，已购买礼包人数/已注册直属好友低于30%进入人工审核；阈值未配置则全部审核。"
              type="info"
              :closable="false"
            />
            <el-button
              v-hasPermi="['mall:invite-gift:edit']"
              type="primary"
              :loading="saving"
              class="friend-save"
              @click="save"
              >保存规则</el-button
            ><span class="friend-version"
              >版本 {{ form.versionNo }} · 生效起点
              {{ form.effectiveFrom }}</span
            >
          </el-form>
        </el-card>
      </el-tab-pane>
      <el-tab-pane label="专属兑换奖品" name="rewards">
        <el-alert
          title="选择现有积分奖品开放茶友兑换，两种兑换共用库存；新增奖品和图片在原奖品管理中维护。"
          :closable="false"
        />
        <el-table :data="data.rewards" stripe>
          <el-table-column
            prop="name"
            label="奖品"
            min-width="180"
          /><el-table-column prop="stock" label="共享库存" width="110" />
          <el-table-column label="所需邀请分" width="210"
            ><template #default="{ row }"
              ><el-input-number
                v-model="row.inviteCost"
                :precision="2"
                :min="0.01"
                :max="999999" /></template
          ></el-table-column>
          <el-table-column label="开放茶友兑换" width="140"
            ><template #default="{ row }"
              ><el-switch
                v-model="row.inviteEnabled"
                :active-value="1"
                :inactive-value="0" /></template
          ></el-table-column>
          <el-table-column label="操作" width="100"
            ><template #default="{ row }"
              ><el-button
                v-hasPermi="['mall:invite-gift:edit']"
                link
                type="primary"
                :loading="savingId === row.id"
                @click="saveReward(row)"
                >保存</el-button
              ></template
            ></el-table-column
          >
        </el-table>
      </el-tab-pane>
      <el-tab-pane label="兑换审核与发货" name="exchanges">
        <div class="friend-filter">
          <el-input
            v-model="keyword"
            placeholder="搜索单号、奖品、客户ID"
            clearable
          /><el-select v-model="statusFilter" clearable placeholder="全部状态"
            ><el-option
              v-for="s in ['待审核', '待发货', '配送中', '已完成', '已取消']"
              :key="s"
              :label="s"
              :value="s" /></el-select
          ><el-button
            @click="
              exchangePage = 1;
              loadExchanges();
            "
            >查询</el-button
          ><el-button @click="exportRows">导出当前页</el-button>
        </div>
        <el-table :data="data.exchanges" stripe>
          <el-table-column
            prop="exchangeNo"
            label="兑换单号"
            min-width="230"
          /><el-table-column
            prop="customerId"
            label="客户ID"
            width="90"
          /><el-table-column
            prop="name"
            label="奖品"
            min-width="130"
          /><el-table-column
            prop="qty"
            label="数量"
            width="70"
          /><el-table-column
            prop="cost"
            label="邀请分"
            width="90"
          /><el-table-column
            prop="status"
            label="状态"
            width="100"
          /><el-table-column
            prop="reviewReason"
            label="审核说明"
            min-width="150"
          />
          <el-table-column label="处理" width="160"
            ><template #default="{ row }"
              ><el-button
                v-if="row.reviewStatus === 'PENDING'"
                v-hasPermi="['mall:invite-gift:edit']"
                link
                type="primary"
                @click="openReview(row)"
                >审核</el-button
              ><el-button
                v-if="
                  row.status === '待发货' && row.reviewStatus === 'APPROVED'
                "
                v-hasPermi="['mall:exchange:edit']"
                link
                type="primary"
                @click="openShipment(row)"
                >填写发货</el-button
              ></template
            ></el-table-column
          >
        </el-table>
        <el-pagination
          v-model:current-page="exchangePage"
          :page-size="20"
          :total="exchangeTotal"
          layout="total, prev, pager, next"
          @current-change="loadExchanges"
        />
      </el-tab-pane>
      <el-tab-pane label="邀请分流水" name="ledger"
        ><div class="friend-filter">
          <el-input
            v-model="ledgerKeyword"
            placeholder="客户ID或变动原因"
            clearable
          /><el-button
            @click="
              ledgerPage = 1;
              loadLedger();
            "
            >查询</el-button
          >
        </div>
        <el-table :data="data.ledger" stripe
          ><el-table-column
            prop="customerId"
            label="客户ID"
            width="100" /><el-table-column
            prop="amount"
            label="变动"
            width="100" /><el-table-column
            prop="balanceAfter"
            label="变动后净额"
            width="130" /><el-table-column
            prop="description"
            label="原因" /><el-table-column
            prop="createTime"
            label="时间"
            width="210" /></el-table
        ><el-pagination
          v-model:current-page="ledgerPage"
          :page-size="20"
          :total="ledgerTotal"
          layout="total, prev, pager, next"
          @current-change="loadLedger"
        />
        <p>负净额表示待补扣邀请分，可用余额为0。</p></el-tab-pane
      >
    </el-tabs>
    <el-dialog v-model="reviewOpen" title="茶友兑换审核" width="500px">
      <el-form label-position="top"
        ><el-form-item label="审核结果"
          ><el-radio-group v-model="reviewForm.action"
            ><el-radio value="APPROVED">通过</el-radio
            ><el-radio value="REJECTED">拒绝并退回</el-radio></el-radio-group
          ></el-form-item
        ><el-form-item label="审核原因（必填）"
          ><el-input
            v-model="reviewForm.reason"
            type="textarea"
            maxlength="500" /></el-form-item
      ></el-form>
      <template #footer
        ><el-button @click="reviewOpen = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="review"
          >确认提交</el-button
        ></template
      >
    </el-dialog>
    <el-dialog v-model="shipmentOpen" title="兑换礼品发货" width="500px"
      ><el-form label-position="top"
        ><el-form-item label="物流公司"
          ><el-input v-model="shipment.carrier" /></el-form-item
        ><el-form-item label="物流单号"
          ><el-input v-model="shipment.trackingNo" /></el-form-item></el-form
      ><template #footer
        ><el-button @click="shipmentOpen = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="ship"
          >确认发货</el-button
        ></template
      ></el-dialog
    >
  </div>
</template>
<script setup>
import MonthlyRewards from './MonthlyRewards.vue';
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";
import { updateMall } from "@/api/mall";
const tab = ref("rules"),
  loading = ref(false),
  saving = ref(false),
  savingId = ref(null),
  error = ref(""),
  keyword = ref(""),
  statusFilter = ref("");
const data = reactive({ products: [], rewards: [], exchanges: [], ledger: [] });
const form = reactive({
  inviteCardTitle: "",
  rewardPrefix: "",
  scoreUnitLabel: "",
  inviteButtonText: "",
  pointsPerFriend: 2.5,
  homeItemLimit: 6,
  largeExchangeScore: null,
  dailyExchangeLimit: null,
  monthlyRewardText: "",
  description: "",
  trialProductIds: [],
});
const reviewOpen = ref(false),
  reviewForm = reactive({ id: null, action: "APPROVED", reason: "" }),
  shipmentOpen = ref(false),
  shipment = reactive({ id: null, carrier: "", trackingNo: "" });
const exchangePage = ref(1),
  exchangeTotal = ref(0),
  ledgerPage = ref(1),
  ledgerTotal = ref(0),
  ledgerKeyword = ref("");
async function loadExchanges() {
  const result = (
    await request({
      url: "/mall/admin/tea-friends/exchanges",
      params: {
        page: exchangePage.value,
        size: 20,
        keyword: keyword.value,
        status: statusFilter.value || "",
      },
    })
  ).data;
  data.exchanges = result.rows;
  exchangeTotal.value = result.total;
}
async function loadLedger() {
  const result = (
    await request({
      url: "/mall/admin/tea-friends/ledger",
      params: {
        page: ledgerPage.value,
        size: 20,
        keyword: ledgerKeyword.value,
      },
    })
  ).data;
  data.ledger = result.rows;
  ledgerTotal.value = result.total;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const result = (await request({ url: "/mall/admin/tea-friends" })).data;
    Object.assign(data, result);
    Object.assign(form, result.config, {
      trialProductIds: result.products
        .filter((p) => Number(p.isTrialGift) === 1)
        .map((p) => Number(p.id)),
    });
    form.pointsPerFriend = Number(form.pointsPerFriend);
    form.largeExchangeScore =
      form.largeExchangeScore == null ? null : Number(form.largeExchangeScore);
    data.rewards = result.rewards.map((r) => ({
      ...r,
      inviteCost: Number(r.inviteCost),
      inviteEnabled: Number(r.inviteEnabled),
    }));
    await Promise.all([loadExchanges(), loadLedger()]);
  } catch (e) {
    error.value = e.message || "数据加载失败";
  } finally {
    loading.value = false;
  }
}
async function save() {
  await ElMessageBox.confirm(
    "保存后影响新订单礼包资格和后续首次计分，是否继续？",
    "保存规则",
  );
  saving.value = true;
  try {
    await request({
      url: "/mall/admin/tea-friends/config",
      method: "put",
      data: {
        ...form,
        largeExchangeScore: form.largeExchangeScore ?? null,
        dailyExchangeLimit: form.dailyExchangeLimit ?? null,
      },
    });
    ElMessage.success("规则已保存");
    await load();
  } finally {
    saving.value = false;
  }
}
async function saveReward(row) {
  savingId.value = row.id;
  try {
    await request({
      url: "/mall/admin/tea-friends/rewards/" + row.id,
      method: "put",
      data: { inviteCost: row.inviteCost, inviteEnabled: row.inviteEnabled },
    });
    ElMessage.success("兑换设置已保存");
  } finally {
    savingId.value = null;
  }
}
function openReview(row) {
  Object.assign(reviewForm, { id: row.id, action: "APPROVED", reason: "" });
  reviewOpen.value = true;
}
async function review() {
  if (reviewForm.reason.trim().length < 2) {
    ElMessage.warning("请填写至少2字审核原因");
    return;
  }
  await ElMessageBox.confirm(
    reviewForm.action === "REJECTED"
      ? "拒绝后将退回邀请分及奖品库存，是否继续？"
      : "确认已核验邀请资格并通过？",
    "兑换审核",
  );
  saving.value = true;
  try {
    await request({
      url: "/mall/admin/tea-friends/exchanges/" + reviewForm.id + "/review",
      method: "put",
      data: reviewForm,
    });
    reviewOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}
function openShipment(row) {
  Object.assign(shipment, { id: row.id, carrier: "", trackingNo: "" });
  shipmentOpen.value = true;
}
async function ship() {
  if (!shipment.carrier.trim() || !shipment.trackingNo.trim()) {
    ElMessage.warning("请填写物流公司和单号");
    return;
  }
  await ElMessageBox.confirm("确认物流信息正确并发货？", "兑换发货");
  saving.value = true;
  try {
    await updateMall("exchanges", shipment.id, {
      ...shipment,
      status: "配送中",
    });
    shipmentOpen.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}
function exportRows() {
  const values = [
    ["兑换单号", "客户ID", "奖品", "数量", "邀请分", "状态"],
    ...data.exchanges.map((r) => [
      r.exchangeNo,
      r.customerId,
      r.name,
      r.qty,
      r.cost,
      r.status,
    ]),
  ];
  const csv = values
    .map((row) =>
      row
        .map(
          (v) =>
            '"' +
            String(v ?? "")
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "茶友兑换记录.csv";
  a.click();
  URL.revokeObjectURL(url);
}
onMounted(load);
</script>
<style scoped>
.friend-admin-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}
.friend-admin-heading small {
  color: #246a51;
  letter-spacing: 2px;
}
.friend-admin-heading h2 {
  margin: 8px 0;
}
.friend-admin-heading p {
  color: #7b847c;
}
.friend-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px;
}
.friend-save {
  margin-top: 20px;
}
.friend-version {
  font-size: 12px;
  color: #8a8e86;
  margin-left: 16px;
}
.friend-filter {
  display: flex;
  gap: 16px;
  margin: 16px 0;
}
.friend-filter .el-input {
  max-width: 340px;
}
@media (max-width: 800px) {
  .friend-form-grid {
    grid-template-columns: 1fr;
  }
  .friend-filter {
    flex-wrap: wrap;
  }
}
</style>
