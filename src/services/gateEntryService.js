import { request } from './apiClient.js';

/**
 * Gate Entry Services
 * All public endpoints - no authentication required
 */

/**
 * Lookup visit by reference code
 */
export const getVisitByReferenceCode = async (referenceCode) => {
	try {
		const response = await request('/prebooking/public/gate/lookup-code', {
			method: 'POST',
			body: {
				ReferenceCode: referenceCode,
			},
		});
		return response;
	} catch (error) {
		throw error;
	}
};

/**
 * Check in visitor
 */
export const checkInVisitor = async (visitID, ppeItems, entryGate, verifiedByEmployeeID) => {
	try {
		const response = await request('/prebooking/public/gate/check-in', {
			method: 'POST',
			body: {
				VisitID: visitID,
				PPEItems: ppeItems,
				EntryGate: entryGate,
				VerifiedByEmployeeID: verifiedByEmployeeID,
			},
		});
		return response;
	} catch (error) {
		throw error;
	}
};

/**
 * Check out visitor
 */
export const checkOutVisitor = async (visitID, exitGate, ppeItems) => {
	try {
		const response = await request('/prebooking/public/gate/check-out', {
			method: 'POST',
			body: {
				VisitID: visitID,
				ExitGate: exitGate,
				PPEItems: ppeItems,
			},
		});
		return response;
	} catch (error) {
		throw error;
	}
};

/**
 * Toggle visit action by reference code
 * First scan -> check-in, second scan -> check-out
 */
export const toggleVisitByReferenceCode = async ({
	referenceCode,
	ppeItems,
	entryGate,
	exitGate,
	verifiedByEmployeeID,
}) => {
	try {
		const response = await request('/prebooking/public/gate/toggle-scan', {
			method: 'POST',
			body: {
				ReferenceCode: referenceCode,
				PPEItems: ppeItems,
				EntryGate: entryGate,
				ExitGate: exitGate,
				VerifiedByEmployeeID: verifiedByEmployeeID,
			},
		});
		return response;
	} catch (error) {
		throw error;
	}
};

/**
 * Get pending check-ins for today
 */
export const getPendingCheckIns = async () => {
	try {
		const response = await request('/prebooking/public/gate/pending');
		return response;
	} catch (error) {
		throw error;
	}
};
