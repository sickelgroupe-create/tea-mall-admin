<template>
 <div>
  <el-card class="partner-form-settings" v-loading="loading">
   <template #header>合伙人申请页面配置（H5 / 小程序同步）</template>
   <el-alert v-if="error" :title="error" type="error" :closable="false" />
   <el-form v-if="form" label-width="110px">
    <el-form-item label="页面标题"><el-input v-model="form.title" maxlength="60" /></el-form-item>
    <el-form-item label="申请说明"><el-input v-model="form.intro" maxlength="500" /></el-form-item>
    <el-form-item label="提交按钮"><el-input v-model="form.submitText" maxlength="20" /></el-form-item>
    <el-form-item label="底部文案"><el-input v-model="form.footerText" maxlength="100" /></el-form-item>
    <el-table :data="form.fields">
     <el-table-column label="字段名称"><template #default="{row}"><el-input v-model="row.label" maxlength="30" /></template></el-table-column>
     <el-table-column label="输入提示"><template #default="{row}"><el-input v-model="row.placeholder" maxlength="100" /></template></el-table-column>
     <el-table-column label="必填" width="90"><template #default="{row}"><el-switch v-model="row.required" /></template></el-table-column>
    </el-table>
    <el-button v-hasPermi="['mall:partner:edit']" type="primary" :loading="saving" @click="save">保存页面配置</el-button>
   </el-form>
   <el-button v-if="error" @click="load">重新加载</el-button>
  </el-card>
  <MallManager mode="partnerApplication" />
 </div>
</template>
<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import MallManager from '../components/MallManager.vue'
const form=ref(null),loading=ref(false),saving=ref(false),error=ref('')
async function load(){loading.value=true;error.value='';try{const r=await request({url:'/mall/admin/partner/form-config',method:'get'});form.value=r.data}catch(e){error.value=e.message||'申请配置加载失败'}finally{loading.value=false}}
async function save(){try{await ElMessageBox.confirm('保存后，用户重新进入申请页会读取新文案及必填规则。','确认保存')}catch{return}saving.value=true;try{await request({url:'/mall/admin/partner/form-config',method:'put',data:form.value});ElMessage.success('申请页面配置已保存');await load()}finally{saving.value=false}}
onMounted(load)
</script>
<style scoped>.partner-form-settings{margin:20px}.partner-form-settings .el-button{margin-top:16px}</style>
