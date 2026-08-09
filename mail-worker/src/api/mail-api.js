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
	const bearer = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
	const actual = c.req.header(pushConst.API_KEY_HEADER) || bearer;

	if (!expected || !actual || actual !== expected) {
		throw new BizError('Invalid API key', 401);
	}
}

async function optionalJson(c) {
	const contentType = c.req.header('content-type') || '';
	if (!contentType.includes('application/json')) return {};
	try {
		return await c.req.json();
	} catch {
		return {};
	}
}

// 原有：高级列表查询
app.post('/mail-api/list', async (c) => {
	await auth(c);
	const data = await mailApiService.list(c, await optionalJson(c));
	return c.json(result.ok(data));
});

// 明确的邮箱路径，GET/POST 均可
app.get('/mail-api/mailbox/:address', async (c) => {
	await auth(c);
	const data = await mailApiService.mailbox(c, c.req.param('address'), {
		page: c.req.query('page'),
		size: c.req.query('size'),
		sort: c.req.query('sort')
	});
	return c.json(result.ok(data));
});

app.post('/mail-api/mailbox/:address', async (c) => {
	await auth(c);
	const body = await optionalJson(c);
	const data = await mailApiService.mailbox(c, c.req.param('address'), body);
	return c.json(result.ok(data));
});

// 兼容你期望的形式：
// GET  /api/mail-api/lucky%40git.192911.xyz
// POST /api/mail-api/lucky%40git.192911.xyz
// POST 可以 Content-Length: 0，不要求 body。
app.get('/mail-api/:target', async (c) => {
	await auth(c);
	const target = decodeURIComponent(c.req.param('target'));

	if (target.includes('@')) {
		const data = await mailApiService.mailbox(c, target, {
			page: c.req.query('page'),
			size: c.req.query('size'),
			sort: c.req.query('sort')
		});
		return c.json(result.ok(data));
	}

	if (/^\d+$/.test(target)) {
		const data = await mailApiService.detail(c, target);
		return c.json(result.ok(data));
	}

	throw new BizError('Invalid mailbox address or emailId', 400);
});

app.post('/mail-api/:target', async (c) => {
	await auth(c);
	const target = decodeURIComponent(c.req.param('target'));

	if (!target.includes('@')) {
		throw new BizError('POST direct endpoint requires an email address', 400);
	}

	const body = await optionalJson(c);
	const data = await mailApiService.mailbox(c, target, body);
	return c.json(result.ok(data));
});
