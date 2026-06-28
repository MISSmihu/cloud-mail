import r2Service from './r2-service';

const EMAIL_CONTENT_PREFIX = 'emails/';
const PREVIEW_LENGTH = 2000;

const encoder = new TextEncoder();

const emailContentService = {

	preview(value) {
		if (!value) return '';
		const text = String(value);
		return text.length > PREVIEW_LENGTH ? text.slice(0, PREVIEW_LENGTH) : text;
	},

	keys(emailId) {
		return {
			contentKey: `${EMAIL_CONTENT_PREFIX}${emailId}/content.html`,
			textKey: `${EMAIL_CONTENT_PREFIX}${emailId}/text.txt`,
			rawKey: `${EMAIL_CONTENT_PREFIX}${emailId}/raw.eml`
		};
	},

	async save(c, emailId, { content, text, raw } = {}) {
		const keys = this.keys(emailId);
		const updates = {};

		if (content) {
			await r2Service.putObj(c, keys.contentKey, encoder.encode(content), {
				contentType: 'text/html; charset=utf-8',
				cacheControl: 'private, max-age=0, no-store'
			});
			updates.contentKey = keys.contentKey;
		}

		if (text) {
			await r2Service.putObj(c, keys.textKey, encoder.encode(text), {
				contentType: 'text/plain; charset=utf-8',
				cacheControl: 'private, max-age=0, no-store'
			});
			updates.textKey = keys.textKey;
		}

		if (raw) {
			await r2Service.putObj(c, keys.rawKey, encoder.encode(raw), {
				contentType: 'message/rfc822; charset=utf-8',
				cacheControl: 'private, max-age=0, no-store'
			});
			updates.rawKey = keys.rawKey;
		}

		return updates;
	},

	async hydrate(c, emailRow) {
		if (!emailRow) return emailRow;

		if (emailRow.contentKey) {
			emailRow.content = await this.readText(c, emailRow.contentKey) || emailRow.content;
		}

		if (emailRow.textKey) {
			emailRow.text = await this.readText(c, emailRow.textKey) || emailRow.text;
		}

		return emailRow;
	},

	async readText(c, key) {
		const obj = await r2Service.getObj(c, key);
		if (!obj) return '';

		if (typeof obj.text === 'function') {
			return await obj.text();
		}

		if (obj instanceof ArrayBuffer) {
			return new TextDecoder().decode(obj);
		}

		return '';
	},

	async removeByRows(c, rows) {
		const keys = [...new Set(rows.flatMap(row => [row.contentKey, row.textKey, row.rawKey]).filter(Boolean))];
		for (let i = 0; i < keys.length; i += 100) {
			await r2Service.delete(c, keys.slice(i, i + 100));
		}
	}

};

export default emailContentService;
