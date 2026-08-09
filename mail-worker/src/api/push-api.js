import app from '../hono/hono';
import result from '../model/result';
import pushConfigService from '../service/push-config-service';
import pushService from '../service/push-service';
import apiTestService from '../service/api-test-service';

app.get('/push/config', async (c) => {
	const config = await pushConfigService.getMasked(c);
	return c.json(result.ok(config));
});

app.put('/push/config', async (c) => {
	await pushConfigService.set(c, await c.req.json());
	return c.json(result.ok());
});

app.post('/push/test/:provider', async (c) => {
	const provider = c.req.param('provider');
	const data = await pushService.test(c, provider);
	return c.json(result.ok(data));
});

app.post('/push/apiKey/regenerate', async (c) => {
	const key = await pushConfigService.generateApiKey(c);
	return c.json(result.ok({ key }));
});

// 后端直接发起 GET/POST，用来测试 API / Webhook，避免浏览器 CORS 干扰。
app.post('/push/api-tester/request', async (c) => {
	const data = await apiTestService.request(c, await c.req.json());
	return c.json(result.ok(data));
});
