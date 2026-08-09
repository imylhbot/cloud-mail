import app from '../hono/hono';
import result from '../model/result';
import pushConfigService from '../service/push-config-service';
import pushConst from '../const/push-const';
import mailApiService from '../service/mail-api-service';
import BizError from '../error/biz-error';

async function auth(c) {
	const config = await pushConfigService.get(c);

	if (!config.api?.enabled) {
		throw new BizError('Mail API disabled', 403);
	}

	const expected = config.api?.key;
	const actual =
		c.req.header(pushConst.API_KEY_HEADER) ||
		c.req.header('authorization')?.replace(/^Bearer\s+/i, '');

	if (!expected || !actual || actual !== expected) {
		throw new BizError('Invalid API key', 401);
	}
}

app.post('/mail-api/list', async (c) => {
	await auth(c);
	const data = await mailApiService.list(c, await c.req.json());
	return c.json(result.ok(data));
});

app.get('/mail-api/:emailId', async (c) => {
	await auth(c);
	const data = await mailApiService.detail(c, c.req.param('emailId'));
	return c.json(result.ok(data));
});
