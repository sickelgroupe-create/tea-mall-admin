<template>
  <section class="monthly-admin" v-loading="busy">
    <el-alert title="金额和周期由后台配置；时间均为北京时间，截止时间不计入本期。每位好友首次满足注册及礼包购买门槛才计入对应周期，同人数按客户编号升序。发布后规则锁定，结束后由管理员结算。" type="info" :closable="false" show-icon />
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <div class="monthly-toolbar"><el-button v-hasPermi="['mall:invite-gift:edit']" type="primary" @click="edit()">新建奖励周期</el-button><el-button @click="load">刷新</el-button></div>
    <el-table :data="periods" border>
      <el-table-column prop="title" label="奖励周期" min-width="150" />
      <el-table-column label="统计时间（北京时间）" min-width="190"><template #default="{row}">{{ row.startsAt }}<br />至 {{ row.endsAt }}（不含）</template></el-table-column>
      <el-table-column label="方式" width="130" align="center"><template #default="{row}">{{ method(row.payoutMethod) }}</template></el-table-column>
      <el-table-column label="状态" width="100" align="center"><template #default="{row}">{{ state(row.status) }}</template></el-table-column>
      <el-table-column label="操作" min-width="300" align="center"><template #default="{row}">
        <el-button v-if="row.status==='DRAFT'" v-hasPermi="['mall:invite-gift:edit']" link type="primary" @click="edit(row)">编辑</el-button>
        <el-button v-if="row.status==='DRAFT'" v-hasPermi="['mall:invite-gift:edit']" link type="primary" @click="operate('publish',row)">发布</el-button>
        <el-button v-if="row.status==='OPEN'" v-hasPermi="['mall:invite-gift:edit']" link type="primary" @click="operate('settle',row)">结束后结算</el-button>
        <el-button v-if="row.status!=='DRAFT'" link type="primary" @click="view(row)">月榜与奖励</el-button>
        <el-button v-if="row.status!=='CANCELLED'" v-hasPermi="['mall:invite-gift:edit']" link type="danger" @click="operate('close',row)">关闭未发奖励</el-button>
      </template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="periodPage" :page-size="20" :total="periodTotal" layout="prev,pager,next,total" @current-change="loadPeriods" />
    <el-card v-if="board" shadow="never" class="monthly-board">
      <h3>{{ board.title }} · {{ board.status==='SETTLED' ? '结算榜单' : '周期榜单' }}</h3>
      <el-alert v-if="board.eligibilityChanged" title="名单中存在退款或账号资格变化，整期暂停继续发放。请核查；可以关闭未发奖励，已发记录保留并线下追踪。" type="warning" :closable="false" />
      <p>名次金额：{{ board.amounts.map((n,i)=>`第${i+1}名 ¥${Number(n).toFixed(2)}`).join('；') }}</p>
      <el-table :data="board.top" max-height="360"><el-table-column prop="rank" label="名次" align="center"/><el-table-column prop="nickname" label="茶友" align="center"/><el-table-column prop="qualifiedCount" label="本期有效好友" align="center"/></el-table>
    </el-card>
    <div class="monthly-toolbar"><h3>{{ selected ? '本期奖励记录' : '全部奖励记录' }}</h3><el-button @click="selected=null;awardPage=1;loadAwards()">查看全部</el-button><el-button @click="exportAwards">导出当前页</el-button></div>
    <el-table :data="awards" border>
      <el-table-column type="expand"><template #default="{row}"><div class="monthly-events"><p>发放凭证：{{ row.payoutReference || '尚未登记' }}；说明：{{row.reason || '无'}}</p><p v-if="row.eligibilityChanged">资格变化：需人工核查，不能冒充已完成。</p><p v-for="(event,i) in row.events" :key="i">{{event.createTime}} · {{event.actorType==='ADMIN'?'后台':'用户'}} · {{state(event.status)}}：{{event.reason}}</p></div></template></el-table-column>
      <el-table-column prop="title" label="周期" min-width="140"/><el-table-column prop="customerId" label="客户" width="90" align="center"/><el-table-column prop="rankNo" label="名次" width="75" align="center"/>
      <el-table-column label="金额（元）" width="110" align="center"><template #default="{row}">{{Number(row.amount).toFixed(2)}}</template></el-table-column>
      <el-table-column label="方式 / 状态" min-width="160" align="center"><template #default="{row}">{{method(row.payoutMethod)}}<br />{{state(row.status)}}</template></el-table-column>
      <el-table-column label="处理" min-width="150" align="center"><template #default="{row}"><el-button v-if="row.status==='PENDING'" v-hasPermi="['mall:invite-gift:edit']" :disabled="row.eligibilityChanged" link type="primary" @click="operate('payout',row)">{{row.payoutMethod==='TEST_CNY'?'测试发放':'登记线下发放'}}</el-button><el-button v-if="row.status==='DISPUTED'" v-hasPermi="['mall:invite-gift:edit']" link type="primary" @click="operate('reply',row)">回复核查</el-button></template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="awardPage" :page-size="20" :total="awardTotal" layout="prev,pager,next,total" @current-change="loadAwards" />
    <el-dialog v-model="editor" title="奖励周期配置" width="min(720px,94vw)" :close-on-click-modal="false">
      <el-form label-position="top"><el-form-item label="周期名称"><el-input v-model="form.title" maxlength="80" placeholder="例如：2026年10月茶友邀请奖励" /></el-form-item>
        <div class="monthly-grid"><el-form-item label="开始时间（含，北京时间）"><el-date-picker v-model="form.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item><el-form-item label="截止时间（不含，北京时间）"><el-date-picker v-model="form.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item></div>
        <el-form-item label="发放方式"><el-select v-model="form.payoutMethod"><el-option label="测试发放（无真实到账）" value="TEST_CNY"/><el-option label="线下发放登记（管理员实际发放后登记，用户确认）" value="OFFLINE_CNY"/></el-select></el-form-item>
        <div class="monthly-grid"><el-form-item v-for="(_,i) in form.amounts" :key="i" :label="`第 ${i+1} 名金额（元，0不发奖）`"><el-input-number v-model="form.amounts[i]" :min="0" :max="999999.99" :precision="2" /></el-form-item></div>
      </el-form><template #footer><el-button @click="editor=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存草稿</el-button></template>
    </el-dialog>
    <el-dialog v-model="operation.open" :title="operation.title" width="min(560px,94vw)" :close-on-click-modal="false">
      <el-alert :title="operation.tip" type="warning" :closable="false"/>
      <el-form label-position="top"><el-form-item v-if="operation.kind==='payout'&&operation.row.payoutMethod==='OFFLINE_CNY'" label="真实线下发放凭证编号（非收款账号）"><el-input v-model="operation.reference" maxlength="120" /></el-form-item><el-form-item label="操作原因 / 核查回复（必填）"><el-input v-model="operation.reason" type="textarea" maxlength="500" show-word-limit /></el-form-item></el-form>
      <template #footer><el-button @click="operation.open=false">取消</el-button><el-button type="primary" :loading="saving" @click="commit">确认操作</el-button></template>
    </el-dialog>
  </section>
</template>
<script setup>
import {ref,reactive,onMounted} from 'vue';
import {ElMessage,ElMessageBox} from 'element-plus';
import request from '@/utils/request';
const base='/mall/admin/tea-friends/monthly';
const busy=ref(false),saving=ref(false),error=ref(''),periods=ref([]),awards=ref([]),board=ref(null),selected=ref(null),periodPage=ref(1),awardPage=ref(1),periodTotal=ref(0),awardTotal=ref(0),editor=ref(false);
const form=reactive({}),operation=reactive({open:false,row:{},kind:'',title:'',tip:'',reference:'',reason:''});
const method=v=>v==='TEST_CNY'?'测试发放（非现金）':'线下发放登记';
const state=v=>({DRAFT:'未发布',OPEN:'已发布',SETTLED:'已结算',CANCELLED:'已关闭',PENDING:'待发放',TEST_PAID:'测试完成，无真实到账',OFFLINE_SENT:'已登记，待确认收款',RECEIVED:'用户已确认收款',DISPUTED:'用户反馈，待核查'}[v]||v);
async function loadPeriods(){const d=(await request({url:base+'/periods',params:{page:periodPage.value}})).data;periods.value=d.rows;periodTotal.value=d.total;}
async function loadAwards(){const d=(await request({url:base+'/awards',params:{page:awardPage.value,periodId:selected.value||undefined}})).data;awards.value=d.rows;awardTotal.value=d.total;}
async function load(){busy.value=true;error.value='';try{await Promise.all([loadPeriods(),loadAwards()]);if(selected.value)board.value=(await request({url:base+'/periods/'+selected.value})).data;}catch(e){error.value=e.message||'月度奖励加载失败';}finally{busy.value=false;}}
async function view(row){selected.value=row.id;awardPage.value=1;await load();}
function edit(row){for(const k of Object.keys(form))delete form[k];Object.assign(form,row?{...row,amounts:row.amounts.map(Number)}:{title:'',startsAt:'',endsAt:'',payoutMethod:'TEST_CNY',amounts:Array(10).fill(0),requestNo:'MONTHLY_'+Date.now()+'_'+Math.random().toString(36).slice(2)});editor.value=true;}
async function save(){saving.value=true;try{await request({url:base+'/periods',method:'post',data:form});editor.value=false;ElMessage.success('草稿已保存，发布后用户端可见');await load();}finally{saving.value=false;}}
function operate(kind,row){const titles={publish:'发布奖励周期',settle:'结算本期奖励',close:'关闭未发奖励',payout:row.payoutMethod==='TEST_CNY'?'测试发放':'登记线下发放',reply:'回复收款核查'};const tips={publish:'发布后金额、时间和方式锁定，不能与其他已发布周期重叠。',settle:'周期结束后按有效邀请生成不可重复的榜单和奖励；本操作不会转账。',close:'将关闭周期及所有尚未发放的奖励，已发记录保留，不能用关闭操作撤销真实收款。',payout:row.payoutMethod==='TEST_CNY'?'仅创建模拟发放记录，不增加钱包余额，不代表真实现金到账。':'请先完成真实线下发放，再登记凭证。此系统不会代为转账；用户需要确认收款。',reply:'回复将展示给用户，不会重发奖励或代替用户确认收款。'};Object.assign(operation,{open:true,kind,row,title:titles[kind],tip:tips[kind],reason:'',reference:''});}
async function commit(){if(operation.reason.trim().length<2){ElMessage.warning('请填写至少2字原因');return;}await ElMessageBox.confirm(operation.tip,'二次确认');saving.value=true;try{const isAward=['payout','reply'].includes(operation.kind);await request({url:base+(isAward?'/awards/':'/periods/')+operation.row.id+'/'+operation.kind,method:'post',data:{reason:operation.reason,reference:operation.reference,action:operation.row.payoutMethod==='TEST_CNY'?'TEST_PAY':'RECORD_OFFLINE'}});operation.open=false;await load();}finally{saving.value=false;}}
function exportAwards(){const rows=[['周期','客户','名次','金额','方式','状态'],...awards.value.map(r=>[r.title,r.customerId,r.rankNo,r.amount,method(r.payoutMethod),state(r.status)])];const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='月度奖励当前页.csv';a.click();URL.revokeObjectURL(url);}
onMounted(load);
</script>
<style scoped>
.monthly-admin{color:#254b3c}.monthly-toolbar{display:flex;align-items:center;justify-content:center;gap:16px;margin:20px 0;flex-wrap:wrap}.monthly-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.monthly-board{margin-top:24px}.monthly-board h3{text-align:center}.monthly-board p{line-height:1.8;word-break:break-word}.monthly-events{padding:12px 24px;line-height:1.7;word-break:break-word}.monthly-admin :deep(.el-pagination){justify-content:center;margin:18px 0}.monthly-grid :deep(.el-date-editor){width:100%}.monthly-admin :deep(.el-alert){margin-bottom:16px}@media(max-width:700px){.monthly-grid{grid-template-columns:1fr}}
</style>
