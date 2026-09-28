<template>
  <nav v-if="route.path.startsWith('/mall/') && links.length" class="mall-settings-nav" aria-label="商城配置入口">
    <strong>配置入口</strong>
    <router-link v-for="item in links" :key="item.path" :to="item.path">{{ item.label }}</router-link>
  </nav>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import auth from '@/plugins/auth'
const route = useRoute()
const links = computed(() => [
  { path:'/mall/partner-application', label:'申请文案 / 必填设置', permission:'mall:partner:list' },
  { path:'/mall/product', label:'商品 / 固定提成', permission:'mall:product:list' },
  { path:'/mall/points-task', label:'消费积分比例 / 任务', permission:'mall:points-task:list' },
  { path:'/mall/invite-gift', label:'邀请文案 / 礼包 / 月榜', permission:'mall:invite-gift:list' },
  { path:'/mall/commission-ledger', label:'佣金账本', permission:'mall:commission-ledger:list' },
  { path:'/mall/withdrawal', label:'提现审核', permission:'mall:withdrawal:list' }
].filter(item => auth.hasPermi(item.permission)))
</script>
<style scoped>
.mall-settings-nav { display:flex; align-items:center; flex-wrap:wrap; gap:12px; padding:14px 24px; background:#fff; border-bottom:1px solid #e5e7eb; font-size:13px; }
.mall-settings-nav a { padding:8px 12px; border:1px solid #d9e4de; border-radius:5px; color:#285a46; text-align:center; }
.mall-settings-nav .router-link-active { background:#edf5f0; border-color:#285a46; }
</style>
