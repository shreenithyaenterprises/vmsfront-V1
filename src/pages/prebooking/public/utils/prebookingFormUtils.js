export const emptyForm = {
  token: '',
  visitorName: '',
  visitorEmail: '',
  visitorMobile: '',
  visitorPhotoBase64: '',
  visitorPhotoFile: null,
  visitorPhotoPreview: '',
  idProofId: '',
  idProofNumber: '',
  purposeId: '',
  hostEmployeeId: '',
  visitDate: '',
  visitTimeSlot: '',
  companyName: '',
  address: '',
  notes: '',
};

export const normalizeList = (payload) => {
  const data = payload?.data;
  if (!data) return [];

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.Items)) return data.Items;
  if (Array.isArray(data?.Data)) return data.Data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.Table)) return data.Table;
  if (Array.isArray(data?.Recordset)) return data.Recordset;

  const seen = new Set();
  const findFirstArray = (value) => {
    if (!value || typeof value !== 'object') return null;
    if (seen.has(value)) return null;
    seen.add(value);

    if (Array.isArray(value)) {
      return value.length === 0 || typeof value[0] === 'object' ? value : null;
    }

    for (const nested of Object.values(value)) {
      const found = findFirstArray(nested);
      if (found) return found;
    }

    return null;
  };

  return findFirstArray(data) || [];
};

export const extractTokenFromLocation = (location) => {
  const params = new URLSearchParams(location.search || '');
  const queryToken =
    params.get('token') ||
    params.get('Token') ||
    params.get('t') ||
    params.get('prebookingToken') ||
    '';

  if (queryToken) return decodeURIComponent(queryToken).trim();

  const hashValue = (location.hash || '').replace(/^#/, '');
  if (hashValue) {
    const hashParams = new URLSearchParams(hashValue);
    const hashToken =
      hashParams.get('token') ||
      hashParams.get('Token') ||
      hashParams.get('t') ||
      hashParams.get('prebookingToken') ||
      '';

    if (hashToken) return decodeURIComponent(hashToken).trim();
  }

  const pathParts = (location.pathname || '').split('/').filter(Boolean);
  const formIndex = pathParts.findIndex((part) => part.toLowerCase() === 'form');
  if (formIndex > -1 && pathParts[formIndex + 1]) {
    return decodeURIComponent(pathParts[formIndex + 1]).trim();
  }

  return '';
};
