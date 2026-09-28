<template><div><el-card style="margin:20px" v-loading="loading"><template #header>消费获得积分比例</template><el-alert title="积分 = 实付金额（元）× 百分比 ÷ 100，向下取整。例如1000%表示每1元获得10积分。只影响新订单，旧订单保留原积分。" type="info" :closable="false" /><el-form v-if="form" label-width="130px"><el-form-item label="获得积分百分比"><el-input-number v-model="form.percent" :min="0" :max="10000" :precision="2" /> %</el-form-item><el-button v-hasPermi="['mall:points-task:edit']" type="primary" :loading="saving" @click="save">保存积分比例</el-button></el-form><el-alert v-if="error" :title="error" type="error" /><el-button v-if="error" @click="load">重新加载</el-button></el-card><MallManager mode="pointsTask" /></div></template>
<script setup>
import { ref,onMounted } from 'vue'
import { ElMessage,ElMessageBox } from 'element-plus'
import request from '@/utils/request'
import MallManager from '../components/MallManager.vue'
const form=ref(null),loading=ref(false),saving=ref(false),error=ref('')
async function load(){loading.value=true;error.value='';try{const r=await request({url:'/mall/admin/points/consumption-config',method:'get'});form.value={...r.data,percent:Number(r.data.percent)}}catch(e){error.value=e.message||'积分比例加载失败'}finally{loading.value=false}}
async function save(){try{await ElMessageBox.confirm('确定更新新订单消费积分比例？','确认保存')}catch{return}saving.value=true;try{await request({url:'/mall/admin/points/consumption-config',method:'put',data:form.value});ElMessage.success('积分比例已保存');await load()}finally{saving.value=false}}
onMounted(load)
</script>
