<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h2>批量导入账号</h2>
        <p>批量创建独立 Cloud Mail 登录账号。支持多种账号/密码文本格式。</p>
      </div>
      <el-button @click="router.push({name:'user'})">返回用户管理</el-button>
    </div>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      class="block"
      title="每一行创建一个独立用户。密码继续使用项目原有哈希逻辑保存，不会明文写入数据库。"
    />

    <el-card shadow="never" class="block">
      <template #header>
        <div class="card-title">1. 导入设置</div>
      </template>

      <el-form label-position="top">
        <el-form-item label="用户角色">
          <el-select v-model="roleId" style="width:100%" placeholder="请选择批量账号的角色">
            <el-option
              v-for="item in roleList"
              :key="item.roleId"
              :label="item.name"
              :value="item.roleId"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="账号数据">
          <el-input
            v-model="rawText"
            type="textarea"
            :rows="15"
            resize="vertical"
            placeholder="支持示例：
账号: abc@example.com | 密码: Abc123!@
abc@example.com|Abc123!@
abc@example.com,Abc123!@
abc@example.com;Abc123!@
abc@example.com    Abc123!@
email: abc@example.com | password: Abc123!@"
          />
        </el-form-item>
      </el-form>

      <div class="toolbar">
        <div class="tip">单次最多 200 个账号；建议先解析预览，再执行创建。</div>
        <div class="actions">
          <el-button :disabled="!rawText.trim()" :loading="parsing" @click="preview">
            解析预览
          </el-button>
          <el-button
            type="primary"
            :disabled="!canCreate"
            :loading="creating"
            @click="createAll"
          >
            创建 {{ previewData?.validCount || 0 }} 个账号
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card v-if="previewData" shadow="never" class="block">
      <template #header>
        <div class="card-title">2. 解析预览</div>
      </template>

      <div class="summary">
        <el-tag>总行数 {{ previewData.totalLines }}</el-tag>
        <el-tag type="success">可创建 {{ previewData.validCount }}</el-tag>
        <el-tag type="danger">格式/校验失败 {{ previewData.invalidCount }}</el-tag>
      </div>

      <el-table
        v-if="previewData.valid?.length"
        :data="previewData.valid"
        max-height="360"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="识别邮箱" min-width="280"/>
        <el-table-column prop="passwordMasked" label="密码" width="120"/>
        <el-table-column label="状态" width="120">
          <template #default>
            <el-tag type="success" size="small">可创建</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-table
        v-if="previewData.invalid?.length"
        :data="previewData.invalid"
        max-height="300"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="邮箱" min-width="240"/>
        <el-table-column prop="raw" label="原始内容" min-width="260"/>
        <el-table-column prop="reason" label="失败原因" min-width="180"/>
      </el-table>
    </el-card>

    <el-card v-if="resultData" shadow="never" class="block">
      <template #header>
        <div class="card-title">3. 创建结果</div>
      </template>

      <div class="summary">
        <el-tag type="success">成功 {{ resultData.successCount }}</el-tag>
        <el-tag type="danger">失败 {{ resultData.failedCount }}</el-tag>
      </div>

      <el-table
        v-if="resultData.success?.length"
        :data="resultData.success"
        max-height="280"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="已创建邮箱"/>
        <el-table-column label="结果" width="120">
          <template #default>
            <el-tag type="success" size="small">成功</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-table
        v-if="resultData.failed?.length"
        :data="resultData.failed"
        max-height="320"
        class="table"
      >
        <el-table-column prop="line" label="行" width="70"/>
        <el-table-column prop="email" label="邮箱" min-width="260"/>
        <el-table-column prop="reason" label="失败原因" min-width="260"/>
      </el-table>

      <div class="result-actions">
        <el-button type="primary" @click="router.push({name:'user'})">查看所有用户</el-button>
        <el-button @click="clearAll">继续导入下一批</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import router from '@/router/index.js';
import { roleSelectUse } from '@/request/role.js';
import { batchParseUsers, batchAddUsers } from '@/request/user-batch.js';

const rawText = ref('');
const roleId = ref(null);
const roleList = ref([]);
const parsing = ref(false);
const creating = ref(false);
const previewData = ref(null);
const resultData = ref(null);

const canCreate = computed(() => {
  return !!roleId.value &&
    !!previewData.value &&
    previewData.value.validCount > 0 &&
    previewData.value.validCount <= 200;
});

watch(rawText, () => {
  previewData.value = null;
  resultData.value = null;
});

async function loadRoles() {
  try {
    roleList.value = await roleSelectUse();
  } catch (e) {
    ElMessage.error(e?.message || '角色列表加载失败');
  }
}

async function preview() {
  parsing.value = true;
  resultData.value = null;
  try {
    previewData.value = await batchParseUsers(rawText.value);
    if (!previewData.value?.validCount) {
      ElMessage.warning('没有识别到可创建的账号');
    }
  } catch (e) {
    ElMessage.error(e?.message || '解析失败');
  } finally {
    parsing.value = false;
  }
}

async function createAll() {
  if (!canCreate.value) return;

  try {
    await ElMessageBox.confirm(
      `确认创建 ${previewData.value.validCount} 个独立用户账号？`,
      '批量创建',
      {
        confirmButtonText: '确认创建',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch {
    return;
  }

  creating.value = true;
  resultData.value = null;

  try {
    const data = await batchAddUsers(rawText.value, roleId.value);
    resultData.value = data;

    if (data.successCount > 0) {
      ElMessage.success(`成功创建 ${data.successCount} 个账号`);
    }
    if (data.failedCount > 0) {
      ElMessage.warning(`有 ${data.failedCount} 条未创建，请查看失败明细`);
    }

    // 创建后重新解析，已存在账号会由真正创建结果体现；
    // 保留原输入，方便用户核对。
  } catch (e) {
    ElMessage.error(e?.message || '批量创建失败');
  } finally {
    creating.value = false;
  }
}

function clearAll() {
  rawText.value = '';
  previewData.value = null;
  resultData.value = null;
}

onMounted(loadRoles);
</script>

<style scoped>
.page {
  padding: 20px;
  max-width: 1180px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-head h2 { margin: 0 0 6px; }
.page-head p, .tip { margin: 0; color: var(--el-text-color-secondary); }
.block { margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; }
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.actions, .summary, .result-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.table { margin-top: 14px; }
.result-actions { margin-top: 16px; justify-content: flex-end; }
@media (max-width: 760px) {
  .page-head, .toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .actions { justify-content: flex-end; }
}
</style>
