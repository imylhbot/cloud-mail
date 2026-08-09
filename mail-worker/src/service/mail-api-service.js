import orm from '../entity/orm';
import email from '../entity/email';
import { and, asc, desc, eq, like } from 'drizzle-orm';

function normalizePage(params = {}) {
	let page = Math.max(1, Number(params.page || params.num) || 1);
	let size = Math.min(100, Math.max(1, Number(params.size) || 20));
	let sort = String(params.sort || params.timeSort || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
	return { page, size, sort };
}

const selectFields = {
	emailId: email.emailId,
	toEmail: email.toEmail,
	toName: email.toName,
	sendEmail: email.sendEmail,
	sendName: email.name,
	subject: email.subject,
	code: email.code,
	text: email.text,
	content: email.content,
	cc: email.cc,
	bcc: email.bcc,
	recipient: email.recipient,
	inReplyTo: email.inReplyTo,
	relation: email.relation,
	messageId: email.messageId,
	type: email.type,
	status: email.status,
	unread: email.unread,
	createTime: email.createTime,
	isDel: email.isDel
};

const mailApiService = {

	async list(c, params = {}) {
		const { page, size, sort } = normalizePage(params);
		const { toEmail, sendEmail, subject, code } = params;

		const conditions = [];
		if (toEmail) conditions.push(eq(email.toEmail, String(toEmail)));
		if (sendEmail) conditions.push(eq(email.sendEmail, String(sendEmail)));
		if (subject) conditions.push(like(email.subject, `%${String(subject)}%`));
		if (code) conditions.push(eq(email.code, String(code)));

		const query = orm(c).select(selectFields).from(email);

		if (conditions.length === 1) {
			query.where(conditions[0]);
		} else if (conditions.length > 1) {
			query.where(and(...conditions));
		}

		query.orderBy(sort === 'asc' ? asc(email.emailId) : desc(email.emailId));

		return query.limit(size).offset((page - 1) * size);
	},

	async mailbox(c, address, params = {}) {
		return this.list(c, {
			...params,
			toEmail: decodeURIComponent(address)
		});
	},

	async detail(c, emailId) {
		return orm(c)
			.select(selectFields)
			.from(email)
			.where(eq(email.emailId, Number(emailId)))
			.get();
	}
};

export default mailApiService;
