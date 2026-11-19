import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

/**
 * Submit direct visitor entry (Security Manual Check)
 * @param {Object} visitData - Visitor details
 * @returns {Promise<Object>} - Response with reference code and success status
 */
export const submitDirectVisitorEntry = async (visitData) => {
	try {
		const token = getToken();
		const response = await request('/prebooking/security-check/create', {
			method: 'POST',
			body: visitData,
			token
		});
		return {
			success: true,
			data: response.data,
			message: response.message
		};
	} catch (error) {
		return {
			success: false,
			message: error.message || 'Failed to submit visitor entry',
			error
		};
	}
};

/**
 * Get list of pending security check requests (for approvers)
 * @returns {Promise<Array>} - List of pending requests
 */
export const getPendingSecurityChecks = async () => {
	try {
		const token = getToken();
		const response = await request('/prebooking/security-check/pending', {
			method: 'GET',
			token
		});
		return {
			success: true,
			data: response.data,
			message: response.message
		};
	} catch (error) {
		return {
			success: false,
			message: error.message || 'Failed to fetch requests',
			error
		};
	}
};

/**
 * Get security check request details
 * @param {number} securityCheckId - Request ID
 * @returns {Promise<Object>} - Request details
 */
export const getSecurityCheckDetails = async (securityCheckId) => {
	try {
		const token = getToken();
		const response = await request(
			`/prebooking/security-check/${securityCheckId}`,
			{ method: 'GET', token }
		);
		return {
			success: true,
			data: response.data,
			message: response.message
		};
	} catch (error) {
		return {
			success: false,
			message: error.message || 'Failed to fetch request details',
			error
		};
	}
};

/**
 * Approve security check request
 * @param {number} securityCheckId - Request ID
 * @param {string} remarks - Approval remarks
 * @returns {Promise<Object>} - Success response with gate pass details
 */
export const approveSecurityCheck = async (securityCheckId, remarks = '') => {
	try {
		const token = getToken();
		const response = await request(
			`/prebooking/security-check/${securityCheckId}/approve`,
			{
				method: 'POST',
				body: { remarks },
				token
			}
		);
		return {
			success: true,
			data: response.data,
			message: response.message
		};
	} catch (error) {
		return {
			success: false,
			message: error.message || 'Failed to approve request',
			error
		};
	}
};

/**
 * Reject security check request
 * @param {number} securityCheckId - Request ID
 * @param {string} remarks - Rejection remarks
 * @returns {Promise<Object>} - Success response
 */
export const rejectSecurityCheck = async (securityCheckId, remarks = '') => {
	try {
		const token = getToken();
		const response = await request(
			`/prebooking/security-check/${securityCheckId}/reject`,
			{
				method: 'POST',
				body: { remarks },
				token
			}
		);
		return {
			success: true,
			data: response.data,
			message: response.message
		};
	} catch (error) {
		return {
			success: false,
			message: error.message || 'Failed to reject request',
			error
		};
	}
};

/**
 * Resend gate pass email to visitor
 * @param {number} securityCheckId - Request ID
 * @returns {Promise<Object>} - Success response
 */
export const resendGatePass = async (securityCheckId) => {
	try {
		const token = getToken();
		const response = await request(
			`/prebooking/security-check/${securityCheckId}/resend-gate-pass`,
			{ method: 'POST', token }
		);
		return {
			success: true,
			data: response.data,
			message: response.message
		};
	} catch (error) {
		return {
			success: false,
			message: error.message || 'Failed to resend gate pass',
			error
		};
	}
};
