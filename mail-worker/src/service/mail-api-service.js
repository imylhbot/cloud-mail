import orm from '../entity/orm';
import email from '../entity/email';
import { and, asc, desc, eq, like } from 'drizzle-orm';

const mailApiService = {

	async list(c, params) {
		let {
			toEmail,
			sendEmail,
			subject,
			code,
			page = 1,
			size = 20,
			sort = 'desc'
		} = params || {};

		page = Math.max(1, Number(page) || 1);
		size = Math.min(100, Math.max(1, Number(size) || 20));

		const conditions = [];
		if (toEmail) conditions.push(eq(email.toEmail, String(toEmail)));
		if (sendEmail) conditions.push(eq(email.sendEmail, String(sendEmail)));
		if (subject) conditions.push(like(email.subject, `%${subject}%`));
		if (code) conditions.push(eq(email.code, String(code)));

		const query = orm(c)
			.select({
				emailId: email.emailId,
				toEmail: email.toEmail,
				toName: email.toName,
				sendEmail: email.sendEmail,
				sendName: email.name,
				subject: email.subject,
				code: email.code,
				text: email.text,
				content: email.content,
				messageId: email.messageId,
				createTime: email.createTime,
				status: email.status,
				isDel: email.isDel
			})
			.from(email);

		if (conditions.length === 1) query.where(conditions[0]);
		if (conditions.length > 1) query.where(and(...conditions));

		query.orderBy(sort === 'asc' ? asc(email.emailId) : desc(email.emailId));

		return query.limit(size).offset((page - 1) * size);
	},

	async detail(c, emailId) {
		return orm(c)
			.select()
			.from(email)
			.where(eq(email.emailId, Number(emailId)))
			.get();
	}
};

export default mailApiService;
