<template>
  <div class="decoration-page">
    <section class="page-head">
      <div>
        <span>TEA MALL CONTENT</span>
        <h1>商城素材 / 页面装修</h1>
        <p>运营图片以新文件保存；页面模块保留修改历史，可恢复上一版本。</p>
      </div>
      <el-button :icon="Refresh" @click="loadAll">刷新</el-button>
    </section>

    <el-tabs v-model="tab" class="content-card">
      <el-tab-pane label="页面装修" name="modules">
        <div class="toolbar">
          <el-button
            v-hasPermi="['mall:decoration:edit']"
            type="primary"
            :icon="Plus"
            @click="editModule()"
            >新增模块</el-button
          >
        </div>
        <el-table v-loading="loading" :data="modules" stripe>
          <el-table-column prop="moduleKey" label="模块键" min-width="170" />
          <el-table-column prop="pageCode" label="页面" width="90" />
          <el-table-column prop="moduleCode" label="用途" width="110" />
          <el-table-column label="图片" width="100"
            ><template #default="s"
              ><el-image
                class="thumb"
                :src="assetUrl(s.row.imageUrl)"
                fit="cover"
                ><template #error
                  ><div class="image-empty">无图</div></template
                ></el-image
              ></template
            ></el-table-column
          >
          <el-table-column
            prop="title"
            label="标题"
            min-width="150"
            show-overflow-tooltip
          />
          <el-table-column
            prop="subtitle"
            label="副标题"
            min-width="180"
            show-overflow-tooltip
          />
          <el-table-column prop="sortNo" label="排序" width="72" />
          <el-table-column label="状态" width="90"
            ><template #default="s"
              ><el-tag :type="s.row.status === '0' ? 'success' : 'info'">{{
                s.row.status === "0" ? "启用" : "停用"
              }}</el-tag></template
            ></el-table-column
          >
          <el-table-column prop="versionNo" label="版本" width="72" />
          <el-table-column fixed="right" label="操作" width="170"
            ><template #default="s">
              <el-button link type="primary" @click="editModule(s.row)"
                >编辑</el-button
              >
              <el-button link @click="openHistory(s.row)"
                >历史 / 恢复</el-button
              >
            </template></el-table-column
          >
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="素材库" name="materials">
        <div class="toolbar">
          <el-button
            v-hasPermi="['mall:decoration:upload']"
            type="primary"
            :icon="UploadFilled"
            @click="uploadOpen = true"
            >上传新图片</el-button
          ><span>已引用素材不可停用，上传不会覆盖原文件。</span>
        </div>
        <el-table v-loading="loading" :data="materials" stripe>
          <el-table-column label="预览" width="100"
            ><template #default="s"
              ><el-image
                class="thumb"
                :src="assetUrl(s.row.url)"
                :preview-src-list="[assetUrl(s.row.url)]"
                fit="cover" /></template
          ></el-table-column>
          <el-table-column prop="name" label="名称" min-width="160" />
          <el-table-column prop="purpose" label="用途" width="120" />
          <el-table-column prop="pageCode" label="页面" width="90" />
          <el-table-column label="尺寸" width="110"
            ><template #default="s"
              >{{ s.row.width }}×{{ s.row.height }}</template
            ></el-table-column
          >
          <el-table-column
            prop="recommendedSize"
            label="推荐尺寸"
            min-width="150"
          />
          <el-table-column label="大小" width="100"
            ><template #default="s">{{
              fileSize(s.row.sizeBytes)
            }}</template></el-table-column
          >
          <el-table-column label="状态" width="90"
            ><template #default="s"
              ><el-tag :type="s.row.status === '0' ? 'success' : 'info'">{{
                s.row.status === "0" ? "可用" : "停用"
              }}</el-tag></template
            ></el-table-column
          >
          <el-table-column fixed="right" label="操作" width="100"
            ><template #default="s"
              ><el-button
                v-if="s.row.status === '0'"
                link
                type="danger"
                @click="disableMaterial(s.row)"
                >停用</el-button
              ></template
            ></el-table-column
          >
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      v-model="moduleOpen"
      :title="moduleForm.id ? '编辑页面模块' : '新增页面模块'"
      width="min(760px, calc(100vw - 32px))"
      destroy-on-close
    >
      <el-form label-position="top" class="form-grid">
        <el-form-item label="模块键"
          ><el-input
            v-model="moduleForm.moduleKey"
            :disabled="!!moduleForm.id"
            placeholder="例如 home.collection"
        /></el-form-item>
        <el-form-item label="页面编号"
          ><el-input v-model="moduleForm.pageCode"
        /></el-form-item>
        <el-form-item label="模块用途"
          ><el-input v-model="moduleForm.moduleCode"
        /></el-form-item>
        <el-form-item label="英文标题"
          ><el-input v-model="moduleForm.englishTitle"
        /></el-form-item>
        <el-form-item label="中文标题"
          ><el-input v-model="moduleForm.title"
        /></el-form-item>
        <el-form-item label="副标题"
          ><el-input v-model="moduleForm.subtitle"
        /></el-form-item>
        <el-form-item label="说明文字" class="span-2"
          ><el-input v-model="moduleForm.description" type="textarea" :rows="3"
        /></el-form-item>
        <el-form-item label="选择已有素材" class="span-2"
          ><el-select
            v-model="moduleForm.imageAssetId"
            clearable
            filterable
            style="width: 100%"
            ><el-option
              v-for="item in activeMaterials"
              :key="item.id"
              :label="`${item.name} · ${item.width}×${item.height}`"
              :value="item.id" /></el-select
        ></el-form-item>
        <el-form-item label="跳转类型"
          ><el-select v-model="moduleForm.jumpType" style="width: 100%"
            ><el-option
              v-for="t in [
                'none',
                'route',
                'product',
                'category',
                'topic',
                'page',
                'support',
              ]"
              :key="t"
              :label="t"
              :value="t" /></el-select
        ></el-form-item>
        <el-form-item label="跳转目标"
          ><el-input v-model="moduleForm.jumpTarget"
        /></el-form-item>
        <el-form-item label="排序"
          ><el-input-number v-model="moduleForm.sortNo" :min="0"
        /></el-form-item>
        <el-form-item label="状态"
          ><el-switch
            v-model="moduleForm.status"
            active-value="0"
            inactive-value="1"
            active-text="启用"
            inactive-text="停用"
        /></el-form-item>
        <el-form-item label="扩展配置（JSON）" class="span-2"
          ><el-input
            v-model="configText"
            type="textarea"
            :rows="8"
            placeholder='首页宣传数字示例：{"metric1Value":"36席","metric1Label":"稀缺配额"}'
        /></el-form-item>
      </el-form>
      <template #footer
        ><el-button @click="moduleOpen = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="saveModule"
          >保存并发布</el-button
        ></template
      >
    </el-dialog>

    <el-dialog
      v-model="uploadOpen"
      title="上传运营图片"
      width="min(620px, calc(100vw - 32px))"
    >
      <el-form label-position="top">
        <el-form-item label="图片名称"
          ><el-input v-model="uploadForm.name"
        /></el-form-item>
        <el-form-item label="用途 / 所属页面 / 模块"
          ><div class="triple">
            <el-input
              v-model="uploadForm.purpose"
              placeholder="用途"
            /><el-input
              v-model="uploadForm.pageCode"
              placeholder="页面"
            /><el-input
              v-model="uploadForm.moduleCode"
              placeholder="模块"
            /></div
        ></el-form-item>
        <el-form-item label="推荐尺寸提示"
          ><el-input
            v-model="uploadForm.recommendedSize"
            placeholder="例如 750×920px，WebP/JPG"
        /></el-form-item>
        <el-form-item label="图片文件"
          ><el-upload
            ref="uploader"
            :auto-upload="false"
            :limit="1"
            accept="image/jpeg,image/png,image/gif,image/webp"
            :on-change="selectFile"
            :on-remove="removeFile"
            ><el-button :icon="UploadFilled">选择图片</el-button
            ><template #tip
              ><div class="upload-tip">
                JPG、PNG、GIF、WebP，最大10MB；服务端校验真实MIME、签名与尺寸。
              </div></template
            ></el-upload
          ></el-form-item
        >
      </el-form>
      <template #footer
        ><el-button @click="uploadOpen = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="uploadMaterial"
          >安全上传</el-button
        ></template
      >
    </el-dialog>

    <el-dialog v-model="historyOpen" title="模块版本历史" width="680px">
      <el-table :data="histories"
        ><el-table-column prop="versionNo" label="版本" /><el-table-column
          prop="operatorId"
          label="操作人"
        /><el-table-column
          prop="createTime"
          label="保存时间"
          min-width="170"
        /><el-table-column label="操作"
          ><template #default="s"
            ><el-button link type="primary" @click="restoreVersion(s.row)"
              >恢复此版本</el-button
            ></template
          ></el-table-column
        ></el-table
      >
    </el-dialog>
  </div>
</template>

<script setup>
import { Plus, Refresh, UploadFilled } from "@element-plus/icons-vue";
import {
  createDecorationModule,
  disableDecorationMaterial,
  listDecorationHistory,
  listDecorationMaterials,
  listDecorationModules,
  restoreDecorationModule,
  updateDecorationModule,
  uploadDecorationMaterial,
} from "@/api/mall";

const { proxy } = getCurrentInstance();
const tab = ref("modules");
const loading = ref(false);
const saving = ref(false);
const modules = ref([]);
const materials = ref([]);
const moduleOpen = ref(false);
const uploadOpen = ref(false);
const historyOpen = ref(false);
const histories = ref([]);
const selectedModule = ref(null);
const selectedFile = ref(null);
const uploader = ref(null);
const configText = ref("{}");
const emptyModule = () => ({
  id: null,
  moduleKey: "",
  pageCode: "",
  moduleCode: "",
  englishTitle: "",
  title: "",
  subtitle: "",
  description: "",
  imageAssetId: null,
  imageUrl: "",
  jumpType: "none",
  jumpTarget: "",
  status: "0",
  sortNo: 0,
  config: {},
});
const moduleForm = reactive(emptyModule());
const uploadForm = reactive({
  name: "",
  purpose: "运营图片",
  pageCode: "common",
  moduleCode: "content",
  recommendedSize: "",
  sortNo: 0,
});
const activeMaterials = computed(() =>
  materials.value.filter((item) => item.status === "0"),
);

function payload(response) {
  return response?.data ?? response ?? [];
}
function assetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/static/")) {
    const storefront = import.meta.env.VITE_MALL_SITE_ORIGIN || "https://chaye.okam.top";
    return new URL(url, storefront).href;
  }
  return `${import.meta.env.VITE_APP_BASE_API}${url}`;
}
function fileSize(bytes) {
  const n = Number(bytes || 0);
  return n < 1024
    ? `${n} B`
    : n < 1048576
      ? `${(n / 1024).toFixed(1)} KB`
      : `${(n / 1048576).toFixed(1)} MB`;
}
async function loadAll() {
  loading.value = true;
  try {
    const [a, b] = await Promise.all([
      listDecorationModules(),
      listDecorationMaterials(),
    ]);
    modules.value = payload(a);
    materials.value = payload(b);
  } finally {
    loading.value = false;
  }
}
function editModule(row) {
  Object.assign(moduleForm, emptyModule(), row || {});
  configText.value = JSON.stringify(row?.config || {}, null, 2);
  moduleOpen.value = true;
}
async function saveModule() {
  let config;
  try {
    config = JSON.parse(configText.value || "{}");
  } catch (_) {
    return proxy.$modal.msgError("扩展配置必须是有效JSON");
  }
  saving.value = true;
  try {
    const body = { ...moduleForm, config };
    if (body.id) await updateDecorationModule(body.id, body);
    else await createDecorationModule(body);
    proxy.$modal.msgSuccess("页面装修已保存");
    moduleOpen.value = false;
    await loadAll();
  } finally {
    saving.value = false;
  }
}
function selectFile(file) {
  selectedFile.value = file.raw;
  if (!uploadForm.name) uploadForm.name = file.name;
}
function removeFile() {
  selectedFile.value = null;
}
async function uploadMaterial() {
  if (!selectedFile.value) return proxy.$modal.msgError("请选择图片");
  const form = new FormData();
  form.append("file", selectedFile.value);
  Object.entries(uploadForm).forEach(([k, v]) =>
    form.append(k, String(v ?? "")),
  );
  saving.value = true;
  try {
    await uploadDecorationMaterial(form);
    proxy.$modal.msgSuccess("新素材已保存，原文件未被覆盖");
    uploadOpen.value = false;
    selectedFile.value = null;
    uploader.value?.clearFiles();
    await loadAll();
  } finally {
    saving.value = false;
  }
}
async function disableMaterial(row) {
  await proxy.$modal.confirm(
    `确认停用素材“${row.name}”？已引用素材会被服务端拒绝。`,
  );
  await disableDecorationMaterial(row.id);
  await loadAll();
}
async function openHistory(row) {
  selectedModule.value = row;
  histories.value = payload(await listDecorationHistory(row.id));
  historyOpen.value = true;
}
async function restoreVersion(row) {
  await proxy.$modal.confirm(
    `确认恢复到版本 ${row.versionNo}？当前版本会先写入历史。`,
  );
  await restoreDecorationModule(selectedModule.value.id, row.id);
  historyOpen.value = false;
  await loadAll();
}
onMounted(loadAll);
</script>

<style scoped>
.decoration-page {
  padding: 24px;
  background: #f4f1e9;
  min-height: calc(100vh - 84px);
}
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 20px;
}
.page-head span {
  font-size: 12px;
  letter-spacing: 0.18em;
  color: #b58345;
}
.page-head h1 {
  margin: 6px 0;
  font-family: SimSun, STSong, serif;
  color: #153e2c;
}
.page-head p {
  margin: 0;
  color: #66736c;
}
.content-card {
  background: #fff;
  border-radius: 16px;
  padding: 18px 22px;
  box-shadow: 0 8px 28px rgba(22, 62, 44, 0.06);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 2px 0 18px;
  color: #738078;
}
.thumb {
  width: 68px;
  height: 52px;
  border-radius: 8px;
}
.image-empty {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eee;
  color: #999;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
.span-2 {
  grid-column: 1/-1;
}
.triple {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}
.upload-tip {
  color: #7a857f;
}
@media (max-width: 700px) {
  .decoration-page {
    padding: 14px;
  }
  .page-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .form-grid,
  .triple {
    grid-template-columns: 1fr;
  }
  .span-2 {
    grid-column: auto;
  }
}
</style>
