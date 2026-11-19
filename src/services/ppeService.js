import { request } from './apiClient.js';
import { getToken } from '../utils/authStorage.js';

/**
 * Get all active PPE items
 * @returns {Promise} - Promise with PPE items data
 */
export const getPPEList = async () => {
    try {
        const token = getToken();
        const response = await request('/master/ppe/list', {
            method: 'GET',
            token,
        });
        return response;
    } catch (error) {
        console.error('Error fetching PPE list:', error);
        throw error;
    }
};
