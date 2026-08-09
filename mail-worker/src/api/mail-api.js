import app from '../hono/hono';
import result from '../model/result';
import pushConfigService from '../service/push-config-service';
import pushConst from '../const/push-const';
import mailApiService from '../service/mail-api-service';
import BizError from '../error/biz-error';

export async function authMailApi(c) {
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

	return config;
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

async function unreadExtract(c, address) {
	const config = await authMailApi(c);

	if (!config.api?.unreadExtractEnabled) {
		throw new BizError('Unread extraction disabled', 403);
	}

	const limit = Math.min(10, Math.max(1, Number(config.api?.unreadLimit) || 10));

	const data = config.api?.markReadAfterExtract === false
		? await mailApiService.unreadList(c, address, limit)
		: await mailApiService.consumeUnread(c, address, limit);

	return c.json(result.ok({
		mailbox: decodeURIComponent(address),
		count: data.length,
		markReadAfterExtract: config.api?.markReadAfterExtract !== false,
		list: data
	}));
}

// 高级列表查询
app.post('/mail-api/list', async (c) => {
	await authMailApi(c);
	const data = await mailApiService.list(c, await optionalJson(c));
	return c.json(result.ok(data));
});

// 未读邮件消费接口：最多 10 条，由后台配置决定是否提取后标已读
app.get('/mail-api/unread/:address', async (c) => {
	return unreadExtract(c, c.req.param('address'));
});

app.post('/mail-api/unread/:address', async (c) => {
	return unreadExtract(c, c.req.param('address'));
});

// 明确 mailbox 路径
app.get('/mail-api/mailbox/:address', async (c) => {
	await authMailApi(c);
	const data = await mailApiService.mailbox(c, c.req.param('address'), {
		page: c.req.query('page'),
		size: c.req.query('size'),
		sort: c.req.query('sort')
	});
	return c.json(result.ok(data));
});

app.post('/mail-api/mailbox/:address', async (c) => {
	await authMailApi(c);
	const body = await optionalJson(c);
	const data = await mailApiService.mailbox(c, c.req.param('address'), body);
	return c.json(result.ok(data));
});

// 简写：邮箱地址直接作为 path
app.get('/mail-api/:target', async (c) => {
	await authMailApi(c);
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
	await authMailApi(c);
	const target = decodeURIComponent(c.req.param('target'));

	if (!target.includes('@')) {
		throw new BizError('POST direct endpoint requires an email address', 400);
	}

	const body = await optionalJson(c);
	const data = await mailApiService.mailbox(c, target, body);
	return c.json(result.ok(data));
});
