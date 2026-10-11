// Every voucher-related API call, one small function each.

import api from './axiosClient.js';

// Removes empty filters so the URL only carries what the user actually chose.
function cleanParams(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null));
}

// All four list endpoints answer with the same shape.
async function fetchList(url, params) {
  const response = await api.get(url, { params: cleanParams(params) });
  return {
    vouchers: response.data.data.vouchers,
    summary: response.data.data.summary,
    pagination: response.data.pagination,
  };
}

export const listMyVouchers = (params) => fetchList('/vouchers/my', params); // Employee
export const listAllVouchers = (params) => fetchList('/vouchers', params); // Director, Accounts
export const listPendingVouchers = (params) => fetchList('/vouchers/pending', params); // Director
export const listApprovedVouchers = (params) => fetchList('/vouchers/approved', params); // Accounts

// -> { voucher, history }
export async function getVoucher(id) {
  const response = await api.get(`/vouchers/${id}`);
  return response.data.data;
}

// Signature images need the login token, so they cannot be loaded with a plain <img src>.
// They are downloaded here as binary data (a Blob) instead. type = 'employee' | 'director'
export async function getSignatureBlob(id, type) {
  const response = await api.get(`/vouchers/${id}/signatures/${type}`, { responseType: 'blob' });
  return response.data;
}

// Text fields + an optional image travel together as multipart/form-data.
function toFormData(values, signatureFile) {
  const formData = new FormData();
  Object.entries(values || {}).forEach(([key, value]) => formData.append(key, value ?? ''));
  if (signatureFile) {
    formData.append('signature', signatureFile);
  }
  return formData;
}

export async function createVoucher(values, signatureFile) {
  const response = await api.post('/vouchers', toFormData(values, signatureFile));
  return response.data.data.voucher;
}

export async function updateVoucher(id, values, signatureFile) {
  const response = await api.put(`/vouchers/${id}`, toFormData(values, signatureFile));
  return response.data.data.voucher;
}

export async function deleteVoucher(id) {
  const response = await api.delete(`/vouchers/${id}`);
  return response.data;
}

// The signature is optional here when the draft already has one saved.
export async function submitVoucher(id, signatureFile) {
  const body = signatureFile ? toFormData({}, signatureFile) : undefined;
  const response = await api.post(`/vouchers/${id}/submit`, body);
  return response.data.data.voucher;
}

// The Director's signature is required - the server refuses the request without it.
export async function approveVoucher(id, signatureFile) {
  const body = signatureFile ? toFormData({}, signatureFile) : undefined;
  const response = await api.post(`/vouchers/${id}/approve`, body);
  return response.data.data.voucher;
}

export async function rejectVoucher(id, reason) {
  const response = await api.post(`/vouchers/${id}/reject`, { reason });
  return response.data.data.voucher;
}
