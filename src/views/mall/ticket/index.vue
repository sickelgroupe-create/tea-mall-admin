<template>
  <MallManager mode="ticket">
    <template #settings>
      <section class="support-contact-card" v-loading="loading">
        <h2>商城客服电话</h2>
        <p>保存后显示在小程序和 H5 的在线客服中，用户点击可拨打。此处不是工单中客户填写的联系方式。</p>
        <el-alert v-if="error" :title="error" type="error" :closable="false" />
        <el-form @submit.prevent="save" label-position="top">
          <el-form-item label="客服电话（未配置时留空）">
            <el-input v-model="phone" maxlength="30" clearable placeholder="请输入真实客服电话" :disabled="!editable || !loaded || saving" />
          </el-form-item>
          <el-button v-hasPermi="['mall:ticket:edit']" type="primary" :loading="saving" :disabled="!loaded || loading" @click="save">保存客服电话</el-button>
          <el-button :disabled="saving" @click="load">重新读取</el-button>
        </el-form>
      </section>
    </template>
  </MallManager>
</template>
<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import useUserStore from '@/store/modules/user'
import MallManager from '../components/MallManager.vue'
import { getSupportContact, saveSupportContact } from '@/api/mall'
const phone = ref(''), error = ref(''), loading = ref(false), loaded = ref(false), saving = ref(false)
const user = useUserStore()
const editable = computed(() => user.permissions.some(p => p === '*:*:*' || p === 'mall:ticket:edit'))
async function load() {
  loading.value = true; loaded.value = false; error.value = ''
  try { phone.value = (await getSupportContact()).data.phone || ''; loaded.value = true }
  catch (e) { error.value = e.message || '客服电话读取失败，请重新读取' }
  finally { loading.value = false }
}
async function save() {
  if (!loaded.value || saving.value || !editable.value) return
  const value = phone.value.trim()
  if (value && (!/^\+?[0-9][0-9 -]{4,28}[0-9]$/.test(value) || value.replace(/\D/g, '').length < 6)) {
    ElMessage.error('请输入有效客服电话（至少6位数字，可含空格、短横线及开头的加号）'); return
  }
  try { await ElMessageBox.confirm(value ? `将商城客服电话保存为 ${value}？` : '清空后，用户将不能从在线客服拨打电话。确定清空？', '确认客服电话') }
  catch { return }
  saving.value = true; error.value = ''
  try { phone.value = (await saveSupportContact(value)).data.phone; ElMessage.success('客服电话已保存') }
  catch (e) { error.value = e.message || '客服电话保存失败，请重试' }
  finally { saving.value = false }
}
onMounted(load)
</script>
<style scoped>
.support-contact-card { padding: 24px; border: 1px solid #e1e5e3; border-radius: 12px; background: #fff; }
.support-contact-card h2 { margin: 0 0 12px; font-size: 18px; }
.support-contact-card p { color: #606966; line-height: 1.6; }
.support-contact-card .el-form { margin-top: 16px; max-width: 540px; }
</style>
