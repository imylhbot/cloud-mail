<template>
  <div class="push-page">
    <div class="head">
      <div>
        <h2>推送中心</h2>
        <p>每个渠道可以独立打开/关闭。第三方推送失败不会影响邮件正常入库。</p>
      </div>
      <el-button type="primary" :loading="saving" @click="save">保存全部配置</el-button>
    </div>

    <el-alert
      title="密钥显示为 ****** 时，保存不会覆盖原密钥。原系统 Telegram/邮箱转发保持独立，不会被这里自动修改。"
      type="info"
      :closable="false"
      show-icon
      class="block"
    />

    <el-card shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">推送总开关</div>
          <div class="desc">关闭后所有新扩展渠道停止推送，原项目功能不受影响。</div>
        </div>
        <el-switch v-model="form.enabled" />
      </div>
    </el-card>

    <el-card v-for="item in channels" :key="item.key" shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">{{ item.title }}</div>
          <div class="desc">{{ item.desc }}</div>
        </div>
        <div class="channel-actions">
          <el-button size="small" :disabled="!form[item.key].enabled" @click="testProvider(item.key)">测试推送</el-button>
          <span class="switch-label">{{ form[item.key].enabled ? '已开启' : '已关闭' }}</span>
          <el-switch v-model="form[item.key].enabled" />
        </div>
      </div>

      <el-form label-position="top">
        <template v-if="item.key === 'telegram'">
          <el-form-item label="Bot Token">
            <el-input v-model="form.telegram.botToken" show-password placeholder="123456:ABC..." />
          </el-form-item>
          <el-form-item label="Chat ID">
            <el-input v-model="form.telegram.chatIds" placeholder="多个用逗号分隔" />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'discord'">
          <el-form-item label="Webhook URL">
            <el-input v-model="form.discord.webhookUrl" show-password />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'wecom'">
          <el-form-item label="企业微信群机器人 Webhook">
            <el-input v-model="form.wecom.webhookUrl" show-password />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'feishu'">
          <el-form-item label="飞书自定义机器人 Webhook">
            <el-input v-model="form.feishu.webhookUrl" show-password />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'dingtalk'">
          <el-form-item label="钉钉自定义机器人 Webhook">
            <el-input v-model="form.dingtalk.webhookUrl" show-password />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'bark'">
          <el-form-item label="Bark Server">
            <el-input v-model="form.bark.serverUrl" placeholder="https://api.day.app" />
          </el-form-item>
          <el-form-item label="Device Key">
            <el-input v-model="form.bark.deviceKey" show-password />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'serverchan'">
          <el-form-item label="SendKey">
            <el-input v-model="form.serverchan.sendKey" show-password />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'pushplus'">
          <el-form-item label="Token">
            <el-input v-model="form.pushplus.token" show-password />
          </el-form-item>
          <el-form-item label="Topic（可选）">
            <el-input v-model="form.pushplus.topic" />
          </el-form-item>
        </template>

        <template v-else-if="item.key === 'webhook'">
          <el-form-item label="Webhook URL">
            <el-input v-model="form.webhook.url" placeholder="https://your-site.example/api/mail" />
          </el-form-item>
          <el-form-item label="Secret">
            <el-input v-model="form.webhook.secret" show-password />
          </el-form-item>
          <el-form-item label="额外 Headers（JSON）">
            <el-input v-model="headersText" type="textarea" :rows="4" placeholder='{"X-App":"cloud-mail"}' />
          </el-form-item>
        </template>
      </el-form>
    </el-card>

    <el-card shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">邮件查询 API</div>
          <div class="desc">GET / POST 均支持直接通过邮箱地址取件。</div>
        </div>
        <div class="channel-actions">
          <span class="switch-label">{{ form.api.enabled ? '已开启' : '已关闭' }}</span>
          <el-switch v-model="form.api.enabled" />
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item label="API Key">
          <div class="inline">
            <el-input v-model="form.api.key" show-password />
            <el-button @click="regenKey">重新生成</el-button>
          </div>
        </el-form-item>

        <el-form-item label="直接取件示例">
          <pre class="code">GET /api/mail-api/lucky%40git.192911.xyz
x-api-key: YOUR_API_KEY

POST /api/mail-api/lucky%40git.192911.xyz
x-api-key: YOUR_API_KEY
Content-Length: 0

POST /api/mail-api/list
x-api-key: YOUR_API_KEY
Content-Type: application/json

{"toEmail":"lucky@git.192911.xyz","page":1,"size":20}</pre>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="block">
      <div class="row-head">
        <div>
          <div class="channel-title">后端 API 调试器</div>
          <div class="desc">由 Cloud Mail Worker 后端直接发起 GET / POST 请求，可用来排查 CORS、Nginx、Webhook 和第三方 API。</div>
        </div>
      </div>

      <el-form label-position="top">
        <el-form-item label="请求方法">
          <el-radio-group v-model="tester.method">
            <el-radio-button value="GET">GET</el-radio-button>
            <el-radio-button value="POST">POST</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="URL">
          <el-input v-model="tester.url" placeholder="https://git.192911.xyz/api/mail-api/lucky%40git.192911.xyz" />
        </el-form-item>

        <el-form-item label="Headers（JSON）">
          <el-input
            v-model="tester.headersText"
            type="textarea"
            :rows="5"
            placeholder='{"x-api-key":"www10086","Content-Type":"application/json"}'
          />
        </el-form-item>

        <el-form-item v-if="tester.method === 'POST'" label="POST Body（可留空）">
          <el-input
            v-model="tester.bodyText"
            type="textarea"
            :rows="5"
            placeholder='{"toEmail":"lucky@git.192911.xyz"}'
          />
        </el-form-item>

        <el-button type="primary" :loading="testingApi" @click="runApiTest">
          后端执行 {{ tester.method }} 测试
        </el-button>

        <div v-if="testerResult" class="result">
          <div class="result-meta">
            HTTP {{ testerResult.status }} {{ testerResult.statusText }} · {{ testerResult.elapsedMs }} ms
          </div>
          <pre class="code">{{ formatResult(testerResult) }}</pre>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import {
  getPushConfig,
  setPushConfig,
  testPush,
  regenerateMailApiKey,
  apiTesterRequest
} from '@/request/push.js';

const saving = ref(false);
const testingApi = ref(false);
const testerResult = ref(null);

const channels = [
  { key: 'telegram', title: 'Telegram', desc: 'Telegram Bot 推送' },
  { key: 'discord', title: 'Discord', desc: 'Discord Webhook' },
  { key: 'wecom', title: '企业微信', desc: '企业微信群机器人' },
  { key: 'feishu', title: '飞书', desc: '飞书自定义机器人' },
  { key: 'dingtalk', title: '钉钉', desc: '钉钉自定义机器人' },
  { key: 'bark', title: 'Bark', desc: 'Bark / 自建 Bark Server' },
  { key: 'serverchan', title: 'Server酱', desc: 'Server酱 SendKey' },
  { key: 'pushplus', title: 'PushPlus', desc: 'PushPlus Token' },
  { key: 'webhook', title: 'Webhook', desc: '自定义 HTTP Webhook' }
];

function emptyConfig() {
  return {
    enabled: true,
    telegram: { enabled: false, botToken: '', chatIds: '' },
    discord: { enabled: false, webhookUrl: '' },
    wecom: { enabled: false, webhookUrl: '' },
    feishu: { enabled: false, webhookUrl: '' },
    dingtalk: { enabled: false, webhookUrl: '' },
    bark: { enabled: false, serverUrl: 'https://api.day.app', deviceKey: '' },
    serverchan: { enabled: false, sendKey: '' },
    pushplus: { enabled: false, token: '', topic: '' },
    webhook: { enabled: false, url: '', secret: '', headers: {} },
    api: { enabled: true, key: '' }
  };
}

const form = reactive(emptyConfig());
const headersText = ref('{}');

const tester = reactive({
  method: 'GET',
  url: '',
  headersText: '{\n  "x-api-key": "www10086"\n}',
  bodyText: ''
});

async function load() {
  const data = await getPushConfig();
  Object.assign(form, emptyConfig(), data || {});
  headersText.value = JSON.stringify(form.webhook.headers || {}, null, 2);
}

function parseJson(text, fallback = {}) {
  if (!text || !text.trim()) return fallback;
  return JSON.parse(text);
}

async function save() {
  saving.value = true;
  try {
    form.webhook.headers = parseJson(headersText.value, {});
    await setPushConfig(JSON.parse(JSON.stringify(form)));
    ElMessage.success('保存成功');
    await load();
  } catch (e) {
    ElMessage.error(e?.message || '保存失败，请检查 JSON 格式');
  } finally {
    saving.value = false;
  }
}

async function testProvider(provider) {
  try {
    form.webhook.headers = parseJson(headersText.value, {});
    await setPushConfig(JSON.parse(JSON.stringify(form)));
    await testPush(provider);
    ElMessage.success(`${provider} 测试请求已完成`);
  } catch (e) {
    ElMessage.error(e?.message || `${provider} 测试失败`);
  }
}

async function regenKey() {
  try {
    const data = await regenerateMailApiKey();
    if (data?.key) {
      form.api.key = data.key;
      ElMessage.success('API Key 已生成');
    }
  } catch (e) {
    ElMessage.error(e?.message || '生成失败');
  }
}

async function runApiTest() {
  testingApi.value = true;
  testerResult.value = null;
  try {
    const headers = parseJson(tester.headersText, {});
    let body = tester.bodyText;
    if (tester.method === 'POST' && body?.trim()) {
      try {
        body = JSON.parse(body);
      } catch {
        // 非 JSON 时按原始字符串发送
      }
    }

    testerResult.value = await apiTesterRequest({
      method: tester.method,
      url: tester.url,
      headers,
      body: tester.method === 'POST' ? body : undefined
    });
  } catch (e) {
    ElMessage.error(e?.message || 'API 测试失败');
  } finally {
    testingApi.value = false;
  }
}

function formatResult(data) {
  return JSON.stringify(data, null, 2);
}

onMounted(load);
</script>

<style scoped>
.push-page {
  padding: 20px;
  max-width: 1050px;
  margin: 0 auto;
}
.head, .row-head, .channel-actions, .inline {
  display: flex;
  align-items: center;
}
.head, .row-head {
  justify-content: space-between;
  gap: 16px;
}
.head {
  align-items: flex-start;
  margin-bottom: 16px;
}
.head h2 {
  margin: 0 0 6px;
}
.head p, .desc {
  color: var(--el-text-color-secondary);
}
.block {
  margin-bottom: 14px;
}
.channel-title {
  font-size: 16px;
  font-weight: 600;
}
.channel-actions {
  gap: 10px;
  flex-shrink: 0;
}
.switch-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.inline {
  width: 100%;
  gap: 10px;
}
.code {
  width: 100%;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  padding: 12px;
  line-height: 1.55;
  overflow: auto;
}
.result {
  margin-top: 16px;
}
.result-meta {
  margin-bottom: 8px;
  font-weight: 600;
}
@media (max-width: 700px) {
  .head, .row-head {
    flex-direction: column;
    align-items: stretch;
  }
  .channel-actions {
    justify-content: flex-end;
  }
  .inline {
    flex-direction: column;
  }
}
</style>
