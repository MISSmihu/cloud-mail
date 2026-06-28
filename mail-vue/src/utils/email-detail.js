import {emailDetail} from '@/request/email.js';
import {allEmailDetail} from '@/request/all-email.js';

export async function loadEmailDetail(email, all = false) {
    const detail = all ? await allEmailDetail(email.emailId) : await emailDetail(email.emailId);
    return {...email, ...detail};
}
