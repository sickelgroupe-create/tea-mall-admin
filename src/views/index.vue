<template>
  <div class="tea-dashboard">
    <section class="hero-panel">
      <div class="hero-copy">
        <div class="eyebrow"><span></span> TEA COMMERCE CONSOLE</div>
        <h1>欢迎回到茶山管理系统</h1>
        <p>从组织与权限开始，稳定管理商城的每一项基础能力。</p>
        <div class="hero-meta">
          <span class="service-state"><i></i> 服务运行正常</span>
          <span>{{ today }}</span>
        </div>
      </div>
      <div class="hero-mark" aria-hidden="true">
        <div class="leaf leaf-one"></div>
        <div class="leaf leaf-two"></div>
        <div class="leaf leaf-three"></div>
        <div class="stem"></div>
      </div>
    </section>

    <section class="stats-grid" v-loading="loading">
      <article v-for="item in stats" :key="item.label" class="stat-card">
        <div class="stat-icon" :class="item.tone">
          <el-icon><component :is="item.icon" /></el-icon>
        </div>
        <div>
          <div class="stat-label">{{ item.label }}</div>
          <div class="stat-value">{{ item.value }}</div>
          <div class="stat-note">{{ item.note }}</div>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <article class="dashboard-card quick-panel">
        <div class="card-heading">
          <div>
            <span class="section-kicker">QUICK ACCESS</span>
            <h2>快捷管理</h2>
          </div>
          <span class="heading-note">常用功能入口</span>
        </div>
        <div class="quick-grid">
          <button v-for="item in shortcuts" :key="item.path" type="button" @click="go(item.path)">
            <span class="quick-icon"><svg-icon :icon-class="item.icon" /></span>
            <span class="quick-copy">
              <strong>{{ item.title }}</strong>
              <small>{{ item.description }}</small>
            </span>
            <el-icon class="quick-arrow"><ArrowRight /></el-icon>
          </button>
        </div>
      </article>

      <article class="dashboard-card status-panel">
        <div class="card-heading">
          <div>
            <span class="section-kicker">SYSTEM STATUS</span>
            <h2>平台状态</h2>
          </div>
          <span class="status-badge" :class="{ 'status-badge--error': !allServicesAvailable }"><i></i> {{ allServicesAvailable ? '正常' : '部分异常' }}</span>
        </div>
        <div class="status-list">
          <div v-for="item in serviceItems" :key="item.name" class="status-row">
            <div>
              <strong>{{ item.name }}</strong>
              <span>{{ item.description }}</span>
            </div>
            <span class="status-ok" :class="{ 'status-ok--error': !item.available }"><el-icon><CircleCheckFilled /></el-icon> {{ item.available ? '可用' : '不可用' }}</span>
          </div>
        </div>
        <div class="security-tip">
          <el-icon><Lock /></el-icon>
          <div><strong>安全提示</strong><span>请定期更新密码并按角色分配最小权限。</span></div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { ArrowRight, CircleCheckFilled, Grid, Lock, OfficeBuilding, User, UserFilled } from '@element-plus/icons-vue'
import { listUser } from '@/api/system/user'
import { listRole } from '@/api/system/role'
import { listDept } from '@/api/system/dept'
import { getRouters } from '@/api/menu'

const router = useRouter()
const loading = ref(true)
const today = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long'
}).format(new Date())

const stats = reactive([
  { label: '系统用户', value: '—', note: '当前有效账号', icon: User, tone: 'green' },
  { label: '角色权限', value: '—', note: '已配置角色', icon: UserFilled, tone: 'amber' },
  { label: '组织部门', value: '—', note: '组织架构节点', icon: OfficeBuilding, tone: 'blue' },
  { label: '可用模块', value: '—', note: '当前账号授权菜单', icon: Grid, tone: 'violet' }
])

const shortcuts = [
  { title: '用户管理', description: '账号、部门与状态', path: '/system/user', icon: 'user' },
  { title: '角色管理', description: '角色与数据权限', path: '/system/role', icon: 'peoples' },
  { title: '菜单管理', description: '导航与按钮权限', path: '/system/menu', icon: 'tree-table' },
  { title: '参数设置', description: '系统运行参数', path: '/system/config', icon: 'edit' }
]

const serviceItems = reactive([
  { name: '管理后台', description: '页面资源已加载', available: true },
  { name: '业务接口', description: '动态路由与鉴权接口', available: false },
  { name: '数据服务', description: '用户、角色和组织查询', available: false }
])
const allServicesAvailable = computed(() => serviceItems.every(item => item.available))

function countMenuModules(nodes = []) {
  return nodes.reduce((total, node) => total + (node.hidden ? 0 : 1) + countMenuModules(node.children || []), 0)
}

function go(path) {
  router.push(path)
}

onMounted(async () => {
  const [users, roles, departments, routers] = await Promise.allSettled([
    listUser({ pageNum: 1, pageSize: 1 }),
    listRole({ pageNum: 1, pageSize: 1 }),
    listDept({}),
    getRouters()
  ])

  if (users.status === 'fulfilled') stats[0].value = users.value.total ?? 0
  if (roles.status === 'fulfilled') stats[1].value = roles.value.total ?? 0
  if (departments.status === 'fulfilled') stats[2].value = departments.value.data?.length ?? 0
  if (routers.status === 'fulfilled') {
    stats[3].value = countMenuModules(routers.value.data || [])
    serviceItems[1].available = true
  }
  serviceItems[2].available = [users, roles, departments].every(item => item.status === 'fulfilled')
  loading.value = false
})
</script>

<style lang="scss" scoped>
.tea-dashboard {
  min-height: calc(100vh - 84px);
  padding: 24px;
  background: #f4f7f5;
  color: #1f2f2a;
}

.hero-panel {
  position: relative;
  min-height: 218px;
  padding: 38px 44px;
  overflow: hidden;
  border-radius: 20px;
  background:
    radial-gradient(circle at 84% 10%, rgba(255, 255, 255, 0.16), transparent 25%),
    linear-gradient(125deg, #173f34 0%, #226b55 58%, #4b9576 100%);
  box-shadow: 0 18px 45px rgba(28, 83, 66, 0.16);
}

.hero-copy { position: relative; z-index: 2; color: #fff; }
.eyebrow { font-size: 11px; letter-spacing: 0.18em; color: #b9e6d3; font-weight: 700; }
.eyebrow span { display: inline-block; width: 22px; height: 2px; margin: 0 9px 3px 0; background: #6fddb1; }
.hero-copy h1 { margin: 17px 0 8px; font-size: 32px; line-height: 1.3; font-weight: 650; letter-spacing: 0.02em; }
.hero-copy p { margin: 0; color: rgba(255, 255, 255, 0.74); font-size: 15px; }
.hero-meta { display: flex; gap: 22px; margin-top: 28px; color: rgba(255, 255, 255, 0.68); font-size: 13px; }
.service-state { color: #d8f6e9; }
.service-state i, .status-badge i { display: inline-block; width: 7px; height: 7px; margin-right: 7px; border-radius: 50%; background: #65e0ad; box-shadow: 0 0 0 4px rgba(101, 224, 173, 0.12); }

.hero-mark { position: absolute; right: 92px; top: 38px; width: 145px; height: 145px; opacity: 0.9; transform: rotate(-6deg); }
.leaf { position: absolute; width: 55px; height: 80px; border: 2px solid rgba(221, 255, 240, 0.48); border-radius: 100% 0 100% 0; }
.leaf-one { left: 48px; top: 0; transform: rotate(28deg); }
.leaf-two { left: 10px; top: 39px; transform: rotate(-26deg) scale(0.88); }
.leaf-three { right: 0; top: 51px; transform: rotate(66deg) scale(0.78); }
.stem { position: absolute; left: 73px; top: 52px; width: 2px; height: 94px; background: rgba(221, 255, 240, 0.48); transform: rotate(7deg); transform-origin: top; }

.stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 18px 0; }
.stat-card { display: flex; align-items: center; gap: 16px; padding: 22px; border: 1px solid #e7ece9; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px rgba(38, 66, 56, 0.04); }
.stat-icon { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 15px; font-size: 23px; }
.stat-icon.green { color: #208565; background: #e8f6f0; }
.stat-icon.amber { color: #b5771f; background: #fff4df; }
.stat-icon.blue { color: #3977aa; background: #eaf3fb; }
.stat-icon.violet { color: #765ca7; background: #f1edfa; }
.stat-label { color: #748079; font-size: 13px; }
.stat-value { margin: 2px 0; color: #233a32; font-size: 27px; line-height: 1.25; font-weight: 700; }
.stat-note { color: #9aa49f; font-size: 12px; }

.content-grid { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(330px, 0.75fr); gap: 18px; }
.dashboard-card { padding: 24px; border: 1px solid #e7ece9; border-radius: 18px; background: #fff; box-shadow: 0 8px 24px rgba(38, 66, 56, 0.04); }
.card-heading { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
.card-heading h2 { margin: 4px 0 0; color: #263c34; font-size: 19px; }
.section-kicker { color: #2d8a6b; font-size: 10px; font-weight: 700; letter-spacing: 0.14em; }
.heading-note { padding-top: 8px; color: #9aa49f; font-size: 12px; }

.quick-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.quick-grid button { display: flex; align-items: center; gap: 13px; width: 100%; padding: 16px; border: 1px solid #e8edea; border-radius: 13px; background: #fbfcfb; color: inherit; text-align: left; cursor: pointer; transition: 0.2s ease; }
.quick-grid button:hover { border-color: #b8d9cc; background: #f4faf7; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(48, 104, 84, 0.08); }
.quick-icon { display: grid; place-items: center; flex: 0 0 40px; height: 40px; border-radius: 11px; color: #287d61; background: #e7f4ef; font-size: 19px; }
.quick-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.quick-copy strong { font-size: 14px; font-weight: 650; }
.quick-copy small { margin-top: 4px; color: #8b9791; font-size: 12px; }
.quick-arrow { color: #9ba7a1; }

.status-badge { padding: 6px 10px; border-radius: 999px; color: #237b5e; background: #edf8f3; font-size: 12px; }
.status-badge i { width: 6px; height: 6px; margin-right: 5px; box-shadow: none; }
.status-badge--error { color: #9a4e36; background: #fff0eb; }
.status-badge--error i { background: #d17255; }
.status-row { display: flex; align-items: center; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid #eef1ef; }
.status-row strong, .status-row span { display: block; }
.status-row strong { color: #34473f; font-size: 13px; }
.status-row div > span { margin-top: 3px; color: #9aa49f; font-size: 11px; }
.status-ok { display: flex !important; align-items: center; gap: 4px; color: #2c8b69; font-size: 12px; }
.status-ok--error { color: #b35e45; }
.security-tip { display: flex; gap: 11px; margin-top: 18px; padding: 13px 14px; border-radius: 12px; color: #7a6334; background: #fff8e9; }
.security-tip > .el-icon { margin-top: 2px; }
.security-tip strong, .security-tip span { display: block; }
.security-tip strong { font-size: 12px; }
.security-tip span { margin-top: 3px; color: #9b865c; font-size: 11px; }

@media (max-width: 1100px) {
  .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .content-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .tea-dashboard { padding: 14px; }
  .hero-panel { padding: 28px 24px; }
  .hero-mark { right: -34px; opacity: 0.35; }
  .hero-copy h1 { font-size: 25px; }
  .stats-grid, .quick-grid { grid-template-columns: 1fr; }
  .hero-meta { flex-direction: column; gap: 8px; }
}
</style>
