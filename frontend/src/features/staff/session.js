import { STAFF_SESSION_KEY } from '../../constants';
import { createSessionStore } from '../auth/session';

// Phiên nhân viên tách khoá với phiên khách: một máy có thể đăng nhập cả hai.
const staff = createSessionStore(STAFF_SESSION_KEY);

export const readStaffSession = staff.read;
export const saveStaffSession = staff.save;
export const clearStaffSession = staff.clear;
export const getStaffToken = staff.getToken;
