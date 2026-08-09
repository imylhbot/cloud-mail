<template>
	<div class="push-page">
		<div class="head">
			<div>
				<h2>推送中心</h2>
				<p>配置新邮件推送渠道。原有 Telegram 和邮箱转发设置不会被修改。</p>
			</div>
			<el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
		</div>

		<el-alert
			title="提示：每个渠道独立推送，某个渠道失败不会影响邮件正常入库。密钥显示为 ****** 时，保存不会覆盖原值。"
			type="info"
			:closable="false"
			show-icon
			style="margin-bottom:16px"
		/>

		<el-card shadow="never" class="card">
			<div class="section-title">
				<span>总开关</span>
				<el-switch v-model="form.enabled" />
			</div>
		</el-card>

		<PushCard title="Telegram" v-model:enabled="form.telegram.enabled" @test="test('telegram')">
			<el-form-item label="Bot Token">
				<el-input v-model="form.telegram.botToken" placeholder="123456:ABC..." show-password />
			</el-form-item>
			<el-form-item label="Chat ID">
				<el-input v-model="form.telegram.chatIds" placeholder="多个用逗号分隔，例如 123,456" />
			</el-form-item>
		</PushCard>

		<PushCard title="Discord" v-model:enabled="form.discord.enabled" @test="test('discord')">
			<el-form-item label="Webhook URL">
				<el-input v-model="form.discord.webhookUrl" placeholder="https://discord.com/api/webhooks/..." show-password />
			</el-form-item>
		</PushCard>

		<PushCard title="企业微信" v-model:enabled="form.wecom.enabled" @test="test('wecom')">
			<el-form-item label="机器人 Webhook">
				<el-input v-model="form.wecom.webhookUrl" placeholder="企业微信群机器人 Webhook URL" show-password />
			</el-form-item>
		</PushCard>

		<PushCard title="飞书" v-model:enabled="form.feishu.enabled" @test="test('feishu')">
			<el-form-item label="机器人 Webhook">
				<el-input v-model="form.feishu.webhookUrl" placeholder="飞书自定义机器人 Webhook URL" show-password />
			</el-form-item>
		</PushCard>

		<PushCard title="钉钉" v-model:enabled="form.dingtalk.enabled" @test="test('dingtalk')">
			<el-form-item label="机器人 Webhook">
				<el-input v-model="form.dingtalk.webhookUrl" placeholder="钉钉自定义机器人 Webhook URL" show-password />
			</el-form-item>
		</PushCard>

		<PushCard title="Bark" v-model:enabled="form.bark.enabled" @test="test('bark')">
			<el-form-item label="Server URL">
				<el-input v-model="form.bark.serverUrl" placeholder="https://api.day.app 或自建 Bark Server" />
			</el-form-item>
			<el-form-item label="Device Key">
				<el-input v-model="form.bark.deviceKey" show-password />
			</el-form-item>
		</PushCard>

		<PushCard title="Server酱" v-model:enabled="form.serverchan.enabled" @test="test('serverchan')">
			<el-form-item label="SendKey">
				<el-input v-model="form.serverchan.sendKey" show-password />
			</el-form-item>
		</PushCard>

		<PushCard title="PushPlus" v-model:enabled="form.pushplus.enabled" @test="test('pushplus')">
			<el-form-item label="Token">
				<el-input v-model="form.pushplus.token" show-password />
			</el-form-item>
			<el-form-item label="Topic">
				<el-input v-model="form.pushplus.topic" placeholder="可选：群组编码" />
			</el-form-item>
		</PushCard>

		<PushCard title="Webhook" v-model:enabled="form.webhook.enabled" @test="test('webhook')">
			<el-form-item label="URL">
				<el-input v-model="form.webhook.url" placeholder="https://your-site.com/api/mail/webhook" />
			</el-form-item>
			<el-form-item label="Secret">
				<el-input v-model="form.webhook.secret" show-password />
			</el-form-item>
			<el-form-item label="额外 Headers(JSON)">
				<el-input
					v-model="headersText"
					type="textarea"
					:rows="4"
					placeholder='{"X-App":"cloud-mail"}'
				/>
			</el-form-item>
		</PushCard>

		<el-card shadow="never" class="card">
			<div class="section-title">
				<div>
					<div class="title">邮件查询 API</div>
					<div class="desc">通过独立 API Key 获取邮件列表和详情，不使用后台登录 Token。</div>
				</div>
				<el-switch v-model="form.api.enabled" />
			</div>

			<el-form label-position="top">
				<el-form-item label="API Key">
					<div class="api-key-row">
						<el-input v-model="form.api.key" show-password />
						<el-button @click="regenKey">重新生成</el-button>
					</div>
				</el-form-item>

				<el-form-item label="调用示例">
					<pre class="code">POST /api/mail-api/list
x-api-key: YOUR_API_KEY
Content-Type: application/json

{
  "toEmail": "abc@example.com",
  "page": 1,
  "size": 20,
  "sort": "desc"
}

GET /api/mail-api/123
x-api-key: YOUR_API_KEY</pre>
				</el-form-item>
			</el-form>
		</el-card>
	</div>
</template>

<script setup>
import { defineComponent, h, onMounted, reactive, ref, resolveComponent } from 'vue';
import { ElMessage } from 'element-plus';
import {
	getPushConfig,
	setPushConfig,
	testPush,
	regenerateMailApiKey
} from '@/request/push.js';

const saving = ref(false);

const empty = () => ({
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
});

const form = reactive(empty());
const headersText = ref('{}');

const PushCard = defineComponent({
	name: 'PushCard',
	props: {
		title: String,
		enabled: Boolean
	},
	emits: ['update:enabled', 'test'],
	setup(props, { emit, slots }) {
		return () => h('div', { class: 'card-wrap' }, [
			h(resolveCard(), { shadow: 'never', class: 'card' }, {
				default: () => [
					h('div', { class: 'section-title' }, [
						h('div', { class: 'title' }, props.title),
						h('div', { class: 'actions' }, [
							h(resolveButton(), {
								size: 'small',
								onClick: () => emit('test')
							}, { default: () => '测试' }),
							h(resolveSwitch(), {
								modelValue: props.enabled,
								'onUpdate:modelValue': v => emit('update:enabled', v)
							})
						])
					]),
					h(resolveForm(), { labelPosition: 'top' }, { default: () => slots.default?.() })
				]
			})
		]);
	}
});

function resolveCard() { return resolveComponent('el-card'); }
function resolveButton() { return resolveComponent('el-button'); }
function resolveSwitch() { return resolveComponent('el-switch'); }
function resolveForm() { return resolveComponent('el-form'); }

async function load() {
	const res = await getPushConfig();
	Object.assign(form, empty(), res.data?.data || res.data || {});
	headersText.value = JSON.stringify(form.webhook.headers || {}, null, 2);
}

async function save() {
	saving.value = true;
	try {
		let headers = {};
		try {
			headers = headersText.value?.trim() ? JSON.parse(headersText.value) : {};
		} catch {
			ElMessage.error('Webhook Headers 必须是合法 JSON');
			return;
		}
		form.webhook.headers = headers;
		await setPushConfig(JSON.parse(JSON.stringify(form)));
		ElMessage.success('保存成功');
		await load();
	} finally {
		saving.value = false;
	}
}

async function test(provider) {
	try {
		let headers = {};
		try {
			headers = headersText.value?.trim() ? JSON.parse(headersText.value) : {};
		} catch {
			headers = {};
		}
		form.webhook.headers = headers;

		// 先保存当前表单，避免测试到旧配置
		await setPushConfig(JSON.parse(JSON.stringify(form)));
		await testPush(provider);
		ElMessage.success(`${provider} 测试已发送`);
	} catch (e) {
		ElMessage.error(e?.message || `${provider} 测试失败`);
	}
}

async function regenKey() {
	const res = await regenerateMailApiKey();
	const key = res.data?.data?.key || res.data?.key;
	if (key) {
		form.api.key = key;
		ElMessage.success('API Key 已重新生成，请立即保存到安全位置');
	}
}

onMounted(load);
</script>

<style scoped>
.push-page {
	padding: 20px;
	max-width: 1000px;
	margin: 0 auto;
}
.head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16px;
	margin-bottom: 16px;
}
.head h2 { margin: 0 0 6px; }
.head p { margin: 0; color: var(--el-text-color-secondary); }
.card-wrap, .card { margin-bottom: 14px; }
.section-title {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 14px;
}
.title { font-size: 16px; font-weight: 600; }
.desc { color: var(--el-text-color-secondary); font-size: 13px; margin-top: 4px; }
.actions { display: flex; align-items: center; gap: 10px; }
.api-key-row { display: flex; width: 100%; gap: 10px; }
.code {
	width: 100%;
	box-sizing: border-box;
	white-space: pre-wrap;
	word-break: break-word;
	background: var(--el-fill-color-light);
	border-radius: 8px;
	padding: 12px;
	line-height: 1.5;
}
@media (max-width: 700px) {
	.head { flex-direction: column; }
	.api-key-row { flex-direction: column; }
}
</style>
