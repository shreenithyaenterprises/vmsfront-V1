import { useEffect, useRef, useState } from 'react';
import { submitDirectVisitorEntry } from '../../../services/directVisitorService';
import { request } from '../../../services/apiClient.js';
import { getToken } from '../../../utils/authStorage.js';

const DirectVisitorEntry = () => {
	const [step, setStep] = useState(1); // 1: Form, 2: Authority selection, 3: Success
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [employees, setEmployees] = useState([]);
	const [authorities, setAuthorities] = useState([]);
	
	const [formData, setFormData] = useState({
		visitorName: '',
		visitorEmail: '',
		visitorMobile: '',
		visitorPhoto: null,
		visitorPhotoBase64: '',
		purposeId: '',
		hostEmployeeId: '',
		approverId: '',
		idProofType: '',
		idProofNumber: '',
		remarks: '',
	});

	const [selectedAuthority, setSelectedAuthority] = useState('');
	const [selectedApprover, setSelectedApprover] = useState('');
	const [authData, setAuthData] = useState(null);
	const [cameraActive, setCameraActive] = useState(false);
	const [cameraStreamReady, setCameraStreamReady] = useState(false);
	const [cameraError, setCameraError] = useState('');
	const videoRef = useRef(null);
	const canvasRef = useRef(null);

	// Handle form input
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	const stopCamera = () => {
		const video = videoRef.current;
		if (video?.srcObject) {
			video.srcObject.getTracks().forEach((track) => track.stop());
			video.srcObject = null;
		}
		setCameraActive(false);
		setCameraStreamReady(false);
	};

	const startCamera = async () => {
		setCameraError('');
		setCameraStreamReady(false);
		setCameraActive(true);

		if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
			setCameraError('Webcam is not supported in this browser. Please use a modern browser.');
			setCameraActive(false);
			return;
		}

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: 'user',
					width: { ideal: 640 },
					height: { ideal: 480 },
				},
				audio: false,
			});

			// Wait one tick so video element is mounted after cameraActive=true.
			await new Promise((resolve) => setTimeout(resolve, 0));

			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				videoRef.current.muted = true;
				setCameraStreamReady(true);
				videoRef.current.play().catch(() => {
					// Some browsers block autoplay even after user gesture; stream is still attached.
				});
			} else {
				stream.getTracks().forEach((track) => track.stop());
				setCameraActive(false);
				setCameraError('Could not initialize camera preview. Please try again.');
			}
		} catch (err) {
			setCameraActive(false);
			setCameraStreamReady(false);
			setCameraError(
				err?.name === 'NotAllowedError'
					? 'Camera permission denied. Please allow camera access in browser settings.'
					: 'Unable to access webcam. Please check camera permissions and try again.'
			);
		}
	};

	const capturePhoto = () => {
		if (!videoRef.current || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const context = canvas.getContext('2d');
		const targetWidth = 640;
		const targetHeight = 480;

		canvas.width = targetWidth;
		canvas.height = targetHeight;
		context.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);

		const base64 = canvas.toDataURL('image/jpeg', 0.7);
		setFormData((prev) => ({
			...prev,
			visitorPhoto: null,
			visitorPhotoBase64: base64,
		}));
		stopCamera();
	};

	useEffect(() => {
		return () => {
			stopCamera();
		};
	}, []);

	// Step 1: Submit basic info
	const handleStep1Submit = async (e) => {
		e.preventDefault();
		
		if (!formData.visitorName.trim() || !formData.visitorEmail.trim() || !formData.visitorMobile.trim()) {
			setError('Please fill all required fields');
			return;
		}

		if (!formData.visitorPhotoBase64) {
			setError('Please capture visitor photo from webcam');
			return;
		}

		setLoading(true);
		setError('');

		try {
			// Fetch all employees for visitor to select
			const token = getToken();
			const data = await request('/master/employee/get', {
				method: 'GET',
				token
			});
			
			setEmployees(data.data || []);
			setStep(2);
		} catch (err) {
			setError('Error: ' + err.message);
		} finally {
			setLoading(false);
		}
	};

	// Step 2: Select approving authority
	const handleStep2Submit = async (e) => {
		e.preventDefault();

		if (!selectedAuthority) {
			setError('Please select a host employee');
			return;
		}

		if (!selectedApprover) {
			setError('Please select an approver');
			return;
		}

		setLoading(true);
		setError('');

		try {
			const payload = {
				...formData,
				hostEmployeeId: parseInt(selectedAuthority),
				approverId: parseInt(selectedApprover),
				visitorPhotoBase64: formData.visitorPhotoBase64,
			};

			const response = await submitDirectVisitorEntry(payload);

			if (response.success) {
				setAuthData(response.data);
				setSuccess('✓ Visitor entry submitted! Approval request sent to authority.');
				setStep(3);
			} else {
				setError(response.message || 'Failed to submit visitor entry');
			}
		} catch (err) {
			setError('Error: ' + err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		stopCamera();
		setStep(1);
		setError('');
		setCameraError('');
		setSuccess('');
		setFormData({
			visitorName: '',
			visitorEmail: '',
			visitorMobile: '',
			visitorPhoto: null,
			visitorPhotoBase64: '',
			purposeId: '',
			hostEmployeeId: '',
			approverId: '',
			idProofType: '',
			idProofNumber: '',
			remarks: '',
		});
		setSelectedAuthority('');
		setSelectedApprover('');
		setAuthData(null);
	};

	// Success Screen
	if (step === 3) {
		return (
			<div className="min-h-screen bg-linear-to-br from-green-500 via-emerald-600 to-green-700 flex items-center justify-center p-4">
				<div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
					<div className="inline-block px-6 py-2 rounded-full text-sm font-bold bg-green-100 text-green-700 mb-6">
						REQUEST SUBMITTED
					</div>
					<div className="text-7xl mb-6">✓</div>
					<h2 className="text-4xl font-bold text-gray-900 mb-4">Success!</h2>
					<p className="text-gray-700 mb-2">
						<strong>{formData.visitorName}</strong>
					</p>
					<p className="text-lg text-green-700 font-semibold mb-6">
						Approval request sent to authority. You'll receive gate pass via email once approved.
					</p>
					<p className="text-sm text-gray-500 mb-8">
						Reference Code: <strong>{authData?.referenceCode || 'Generating...'}</strong>
					</p>

					<button
						onClick={handleReset}
						className="w-full bg-linear-to-r from-blue-600 to-purple-700 hover:from-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
					>
						Register Another Visitor
					</button>
				</div>
			</div>
		);
	}

	// Step 2: Select Authority
	if (step === 2) {
		return (
			<div className="min-h-screen bg-linear-to-br from-blue-600 to-purple-900 p-4 sm:p-6 flex items-center justify-center">
				<div className="max-w-2xl w-full">
					<div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
						<div className="bg-linear-to-r from-blue-600 to-purple-700 text-white p-6 sm:p-8">
							<button
								onClick={() => setStep(1)}
								className="mb-4 text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition"
							>
								← Back
							</button>
							<h1 className="text-3xl sm:text-4xl font-bold">Select Host & Approver</h1>
							<p className="text-white/90 text-lg mt-2">Choose the host employee and approval authority</p>
						</div>

						<div className="p-6 sm:p-8 space-y-6">
							{error && (
								<div className="bg-red-100 border-l-4 border-red-600 p-4 rounded">
									<p className="text-red-800 font-semibold">{error}</p>
								</div>
							)}

							<div>
								<label className="block text-lg font-bold text-gray-900 mb-4">
									👤 Host Employee (Who is being visited) <span className="text-red-600">*</span>
								</label>
								<div className="space-y-3 max-h-60 overflow-y-auto">
									{employees.length === 0 ? (
										<p className="text-gray-600 text-center py-4">No employees available</p>
									) : (
										employees.map(emp => (
											<button
												key={emp.employee_id}
												onClick={() => setSelectedAuthority(emp.employee_id)}
												className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
													selectedAuthority === emp.employee_id
														? 'border-blue-600 bg-blue-50'
														: 'border-gray-300 bg-white hover:border-blue-400'
												}`}
											>
												<div className="font-bold text-gray-900">{emp.name}</div>
												<div className="text-sm text-gray-600 flex justify-between">
													<span>{emp.designation || 'Employee'}</span>
													<span>{emp.department || 'N/A'}</span>
												</div>
											</button>
										))
									)}
								</div>
							</div>

							<div className="border-t-2 border-gray-200 pt-4">
								<label className="block text-lg font-bold text-gray-900 mb-4">
									✅ Approver (Who will approve this entry) <span className="text-red-600">*</span>
								</label>
								<div className="space-y-3 max-h-60 overflow-y-auto">
									{employees.length === 0 ? (
										<p className="text-gray-600 text-center py-4">No employees available</p>
									) : (
										employees.map(emp => (
											<button
												key={`approver-${emp.employee_id}`}
												onClick={() => setSelectedApprover(emp.employee_id)}
												className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
													selectedApprover === emp.employee_id
														? 'border-green-600 bg-green-50'
														: 'border-gray-300 bg-white hover:border-green-400'
												}`}
											>
												<div className="font-bold text-gray-900">{emp.name}</div>
												<div className="text-sm text-gray-600 flex justify-between">
													<span>{emp.designation || 'Employee'}</span>
													<span>{emp.department || 'N/A'}</span>
												</div>
											</button>
										))
									)}
								</div>
							</div>

							<div className="flex gap-4 pt-4">
								<button
									onClick={handleStep2Submit}
									disabled={loading || !selectedAuthority || !selectedApprover}
									className="flex-1 bg-linear-to-r from-green-600 to-emerald-700 hover:from-green-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all"
								>
									{loading ? '⏳ Submitting...' : '✓ Submit'}
								</button>
								<button
									onClick={() => setStep(1)}
									className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-6 rounded-xl"
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Step 1: Basic Information Form
	return (
		<div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6">
			<div className="max-w-3xl mx-auto">
				<div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
					{/* Header */}
					<div className="bg-linear-to-r from-blue-600 to-purple-700 text-white p-6 sm:p-8">
						<h1 className="text-3xl sm:text-4xl font-bold text-center">
							🚨 Direct Visitor Entry
						</h1>
						<p className="text-white/90 text-center text-lg mt-2">
							Security Manual Check - Register visitor without pre-booking
						</p>
					</div>

					{/* Form */}
					<form onSubmit={handleStep1Submit} className="p-6 sm:p-8 space-y-6">
						{error && (
							<div className="bg-red-100 border-l-4 border-red-600 p-4 rounded">
								<p className="text-red-800 font-semibold">{error}</p>
							</div>
						)}

						{/* Visitor Name */}
						<div>
							<label className="block text-lg font-bold text-gray-900 mb-3">
								👤 Visitor Name <span className="text-red-600">*</span>
							</label>
							<input
								type="text"
								name="visitorName"
								value={formData.visitorName}
								onChange={handleInputChange}
								placeholder="Enter full name"
								className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
								required
							/>
						</div>

						{/* Email */}
						<div>
							<label className="block text-lg font-bold text-gray-900 mb-3">
								📧 Email <span className="text-red-600">*</span>
							</label>
							<input
								type="email"
								name="visitorEmail"
								value={formData.visitorEmail}
								onChange={handleInputChange}
								placeholder="visitor@example.com"
								className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
								required
							/>
						</div>

						{/* Mobile */}
						<div>
							<label className="block text-lg font-bold text-gray-900 mb-3">
								📱 Mobile Number <span className="text-red-600">*</span>
							</label>
							<input
								type="tel"
								name="visitorMobile"
								value={formData.visitorMobile}
								onChange={handleInputChange}
								placeholder="9876543210"
								className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
								required
							/>
						</div>

						{/* Photo */}
						<div>
							<label className="block text-lg font-bold text-gray-900 mb-3">
								📸 Visitor Photo <span className="text-red-600">*</span>
							</label>
							<div className="space-y-3">
								{formData.visitorPhotoBase64 && (
									<img
										src={formData.visitorPhotoBase64}
										alt="Visitor"
										onClick={startCamera}
										title="Click to retake photo"
										className="w-28 h-28 rounded-lg object-cover border-2 border-blue-300 cursor-pointer hover:border-blue-500"
									/>
								)}

								{cameraActive ? (
									<div className="space-y-3">
										<video
											ref={videoRef}
											autoPlay
											muted
											playsInline
											className="w-full max-w-sm h-64 object-cover rounded-xl border-2 border-blue-300 bg-black"
										/>
										<div className="flex gap-3">
											<button
												type="button"
												onClick={capturePhoto}
												disabled={!cameraStreamReady}
												className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
											>
												Capture Photo
											</button>
											<button
												type="button"
												onClick={stopCamera}
												className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg"
											>
												Cancel Camera
											</button>
										</div>
										{!cameraStreamReady && (
											<p className="text-sm text-amber-700">Waiting for camera stream...</p>
										)}
									</div>
								) : (
									<button
										type="button"
										onClick={startCamera}
										className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl"
									>
										Open Camera
									</button>
								)}

								{formData.visitorPhotoBase64 && !cameraActive && (
									<p className="text-sm text-gray-600">Click the photo to retake.</p>
								)}

								{cameraError && <p className="text-sm text-red-700">{cameraError}</p>}
								<canvas ref={canvasRef} className="hidden" />
							</div>
						</div>

						{/* ID Proof */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-lg font-bold text-gray-900 mb-3">
									🪪 ID Type
								</label>
								<select
									name="idProofType"
									value={formData.idProofType}
									onChange={handleInputChange}
									className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
								>
									<option value="">Select ID Type</option>
									<option value="AADHAR">Aadhar</option>
									<option value="PASSPORT">Passport</option>
									<option value="DRIVER_LICENSE">Driver's License</option>
									<option value="PAN">PAN</option>
									<option value="VOTER_ID">Voter ID</option>
								</select>
							</div>
							<div>
								<label className="block text-lg font-bold text-gray-900 mb-3">
									📄 ID Number
								</label>
								<input
									type="text"
									name="idProofNumber"
									value={formData.idProofNumber}
									onChange={handleInputChange}
									placeholder="ID number"
									className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
								/>
							</div>
						</div>

						{/* Purpose */}
						<div>
							<label className="block text-lg font-bold text-gray-900 mb-3">
								📋 Purpose of Visit
							</label>
							<select
								name="purposeId"
								value={formData.purposeId}
								onChange={handleInputChange}
								className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all"
							>
								<option value="">Select Purpose</option>
								<option value="1">Meeting</option>
								<option value="2">Conference</option>
								<option value="3">Training</option>
								<option value="4">Inspection</option>
								<option value="5">Delivery</option>
								<option value="6">Other</option>
							</select>
						</div>

						{/* Remarks */}
						<div>
							<label className="block text-lg font-bold text-gray-900 mb-3">
								📝 Remarks
							</label>
							<textarea
								name="remarks"
								value={formData.remarks}
								onChange={handleInputChange}
								placeholder="Any additional information for security check..."
								className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all resize-none min-h-24"
							/>
						</div>

						{/* Buttons */}
						<div className="flex gap-4 pt-4">
							<button
								type="submit"
								disabled={loading}
								className="flex-1 bg-linear-to-r from-blue-600 to-purple-700 hover:from-blue-700 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all text-lg"
							>
								{loading ? '⏳ Processing...' : '➜ Next Step'}
							</button>
							<button
								type="reset"
								onClick={handleReset}
								className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-6 rounded-xl transition-all text-lg"
							>
								Clear
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
};

export default DirectVisitorEntry;
