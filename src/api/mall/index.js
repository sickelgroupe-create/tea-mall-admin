import request from '@/utils/request'

export function getSupportContact() {
  return request({ url: '/mall/admin/support/contact', method: 'get' })
}

export function saveSupportContact(phone) {
  return request({ url: '/mall/admin/support/contact', method: 'put', data: { phone } })
}

export function getMallOverview() {
  return request({ url: '/mall/admin/overview', method: 'get' })
}

export function listMall(kind) {
  return request({ url: `/mall/admin/${kind}`, method: 'get' })
}

export function updateMall(kind, id, data) {
  return request({ url: `/mall/admin/${kind}/${id}`, method: 'put', data })
}

export function createMall(kind, data) {
  return request({ url: `/mall/admin/${kind}`, method: 'post', data })
}

export function deleteMall(kind, id) {
  return request({ url: `/mall/admin/${kind}/${id}`, method: 'delete' })
}

export function listDecorationMaterials() {
  return request({ url: '/mall/admin/decoration/materials', method: 'get' })
}

export function uploadDecorationMaterial(data) {
  return request({
    url: '/mall/admin/decoration/materials/upload',
    method: 'post',
    data,
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function disableDecorationMaterial(id) {
  return request({ url: `/mall/admin/decoration/materials/${id}`, method: 'delete' })
}

export function listDecorationModules() {
  return request({ url: '/mall/admin/decoration/modules', method: 'get' })
}

export function createDecorationModule(data) {
  return request({ url: '/mall/admin/decoration/modules', method: 'post', data })
}

export function updateDecorationModule(id, data) {
  return request({ url: `/mall/admin/decoration/modules/${id}`, method: 'put', data })
}

export function listDecorationHistory(id) {
  return request({ url: `/mall/admin/decoration/modules/${id}/history`, method: 'get' })
}

export function restoreDecorationModule(id, historyId) {
  return request({ url: `/mall/admin/decoration/modules/${id}/restore/${historyId}`, method: 'put' })
}
