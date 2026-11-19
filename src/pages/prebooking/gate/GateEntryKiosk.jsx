import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
	getVisitByReferenceCode,
	toggleVisitByReferenceCode,
} from '../../../services/gateEntryService.js';
import { getPPEList } from '../../../services/ppeService.js';

// Helper function to decode HTML entities in base64 strings
const decodeHtmlEntities = (str) => {
	if (!str) return str;
	const textarea = document.createElement('textarea');
	textarea.innerHTML = str;
	return textarea.value;
};

const parsePPEItems = (value) => {
	if (!value) return [];
	return String(value)
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item && item.toLowerCase() !== 'none');
};

const getVisitorPhotoSrc = (photo) => {
	const value = decodeHtmlEntities(String(photo || '')).trim();
	if (!value) return '';

	if (
		value.startsWith('data:image') ||
		value.startsWith('http://') ||
		value.startsWith('https://') ||
		value.startsWith('/')
	) {
		return value;
	}

	const normalizedBase64 = value.replace(/\s+/g, '');
	const mimeType = normalizedBase64.startsWith('iVBOR')
		? 'image/png'
		: normalizedBase64.startsWith('R0lGOD')
			? 'image/gif'
			: normalizedBase64.startsWith('UklGR')
				? 'image/webp'
				: 'image/jpeg';

	return `data:${mimeType};base64,${normalizedBase64}`;
};

const GateEntryKiosk = () => {
	const [mode, setMode] = useState('idle'); // 'idle', 'qr' or 'manual'
	const [scanResult, setScanResult] = useState(null);
	const [manualCode, setManualCode] = useState('');
	const [isScanning, setIsScanning] = useState(false);
	const [visitDetails, setVisitDetails] = useState(null);
	const [showPPEForm, setShowPPEForm] = useState(false);
	const [ppeList, setPpeList] = useState([]);
	const [selectedPPE, setSelectedPPE] = useState([]);
	const [isCheckingIn, setIsCheckingIn] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');
	const [lastActionResult, setLastActionResult] = useState(null);
	const [selectedGate, setSelectedGate] = useState('Main Gate');

	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const streamRef = useRef(null);

	// Fetch PPE list on component mount
	useEffect(() => {
		const fetchPPEList = async () => {
			try {
				const response = await getPPEList();
				if (response.success && response.data) {
					setPpeList(response.data);
				}
			} catch (err) {
				console.error('Error loading PPE list:', err);
			}
		};
		fetchPPEList();
	}, []);

	// Toggle an individual PPE item for clear multi-select behavior.
	const handlePPEToggle = (itemName) => {
		setSelectedPPE((prev) =>
			prev.includes(itemName)
				? prev.filter((name) => name !== itemName)
				: [...prev, itemName]
		);
	};

	const handleSelectAllPPE = () => {
		setSelectedPPE(ppeList.map((item) => item.Name));
	};

	const handleClearPPE = () => {
		setSelectedPPE([]);
	};

	// QR Scanner hook
	useEffect(() => {
		if (mode !== 'qr' || isScanning) return;

		const startScanning = async () => {
			try {
				setIsScanning(true);
				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'environment' },
				});
				streamRef.current = stream;

				if (videoRef.current) {
					videoRef.current.srcObject = stream;

					const interval = setInterval(() => {
						if (videoRef.current && canvasRef.current) {
							const canvas = canvasRef.current;
							const context = canvas.getContext('2d');
							canvas.width = videoRef.current.videoWidth;
							canvas.height = videoRef.current.videoHeight;

							context.drawImage(
								videoRef.current,
								0,
								0,
								canvas.width,
								canvas.height
							);

							const imageData = context.getImageData(
								0,
								0,
								canvas.width,
								canvas.height
							);
							const code = jsQR(
								imageData.data,
								canvas.width,
								canvas.height
							);

							if (code) {
								clearInterval(interval);
								setScanResult(code.data);
								stopCamera();
							}
						}
					}, 500);

					return () => clearInterval(interval);
				}
			} catch (err) {
				setError('Unable to access camera');
				setIsScanning(false);
			}
		};

		startScanning();
	}, [mode]);

	const stopCamera = () => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
		}
		setIsScanning(false);
	};

	// Fetch visit details
	const fetchVisitDetails = async (code) => {
		try {
			setError('');
			const data = await getVisitByReferenceCode(code);

			if (!data.success) {
				setError(data.message || 'Unable to fetch visit details');
				setVisitDetails(null);
				return;
			}

			const visitData = data.data;
			setVisitDetails(visitData);

			if (visitData?.visitStatus === 'CHECKED_IN') {
				// For checkout, preselect previously issued PPE so gate staff can confirm returns quickly.
				const defaultReturned = parsePPEItems(
					visitData?.returnedPPEItems || visitData?.ppeItems
				);
				setSelectedPPE(defaultReturned);
			} else {
				setSelectedPPE([]);
			}

			setShowPPEForm(true);
		} catch (err) {
			setError(err.message || 'Network error');
			setVisitDetails(null);
		}
	};

	// Handle QR scan result
	useEffect(() => {
		if (scanResult) {
			fetchVisitDetails(scanResult);
		}
	}, [scanResult]);

	// Handle manual code submission
	const handleManualCodeSubmit = () => {
		if (!manualCode.trim()) {
			setError('Please enter a reference code');
			return;
		}
		fetchVisitDetails(manualCode.trim());
		setManualCode('');
	};

	// Handle check-in/check-out toggle by same QR code
	const handleVisitAction = async () => {
		if (!visitDetails) {
			setError('Visit details not found');
			return;
		}

		try {
			setIsCheckingIn(true);
			setError('');

			const data = await toggleVisitByReferenceCode({
				referenceCode: visitDetails.referenceCode,
				ppeItems: selectedPPE.length > 0 ? selectedPPE.join(', ') : 'None',
				entryGate: selectedGate,
				exitGate: selectedGate,
				verifiedByEmployeeID: 0,
			});

			if (!data.success) {
				setError(data.message || 'Check-in failed');
				return;
			}

			const action = data?.data?.action;
			setLastActionResult({
				action,
				visitorName:
					data?.data?.visitorName ||
					visitDetails?.visitorName ||
					'Visitor',
				hostEmployeeName:
					data?.data?.hostEmployeeName || visitDetails?.hostEmployeeName || '',
			});
			
			let successMessage = '✓ Visitor checked in successfully!';
			if (action === 'CHECK_OUT') {
				successMessage = '✓ Visitor checked out successfully!';
			} else if (action === 'RE_CHECK_IN') {
				successMessage = '✓ Visitor re-checked in successfully!';
			}
			setSuccess(successMessage);
			setVisitDetails(null);
			setShowPPEForm(false);
			setSelectedPPE([]);
			setScanResult(null);

			// Reset for next visitor
			setTimeout(() => {
				setSuccess('');
				setMode('qr');
			}, 3000);
		} catch (err) {
			setError(err.message || 'Action failed');
		} finally {
			setIsCheckingIn(false);
		}
	};

	const handleReset = () => {
		stopCamera();
		setVisitDetails(null);
		setShowPPEForm(false);
		setSelectedPPE([]);
		setScanResult(null);
		setManualCode('');
		setError('');
		setSuccess('');
		setLastActionResult(null);
		setMode('idle');
	};

	if (success) {
		const isCheckOut = lastActionResult?.action === 'CHECK_OUT';
		const isReEntry = lastActionResult?.action === 'RE_CHECK_IN';
		return (
			<div className="min-h-screen bg-gradient-to-b from-green-400 via-green-500 to-emerald-600 flex items-center justify-center p-4 sm:p-6 md:p-8">
				<div className="bg-white rounded-3xl p-8 sm:p-12 md:p-16 shadow-2xl max-w-2xl w-full text-center">
					{/* Badge */}
					<div
						className={`inline-block px-6 py-2 rounded-full text-xs sm:text-sm font-bold font-mono mb-6 sm:mb-8 tracking-widest ${
							isCheckOut
								? 'bg-blue-100 text-blue-700'
								: isReEntry
									? 'bg-purple-100 text-purple-700'
									: 'bg-green-100 text-green-700'
						}`}
					>
						{isCheckOut ? '→ CHECK-OUT' : isReEntry ? '↺ RE-ENTRY' : '← CHECK-IN'}
					</div>

					{/* Success Icon */}
					<div className="text-6xl sm:text-7xl md:text-8xl mb-6">
						✓
					</div>

					{/* Main Message */}
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-3 md:mb-4">
						{isCheckOut ? 'Goodbye!' : 'Welcome Back!'}
					</h2>

					{/* Visitor Name */}
					<p className="text-xl sm:text-2xl md:text-3xl text-gray-700 font-semibold mb-2">
						{lastActionResult?.visitorName}
					</p>

					{/* Status Message */}
					<p className="text-base sm:text-lg md:text-xl text-emerald-600 font-semibold mb-6 md:mb-8">
						{isCheckOut
							? 'Visitor has been checked out successfully.'
							: isReEntry
								? `You have re-entered to meet ${lastActionResult?.hostEmployeeName || 'Host'}`
								: `You are checked in to meet ${
										lastActionResult?.hostEmployeeName || 'Host'
								  }`}
					</p>

					{/* Timer */}
					<p className="text-sm sm:text-base text-gray-500">
						Ready for next visitor...
					</p>
				</div>
			</div>
		);
	}

	if (showPPEForm && visitDetails) {
		const isAlreadyCheckedIn = visitDetails?.visitStatus === 'CHECKED_IN';
		const visitorPhotoSrc = getVisitorPhotoSrc(visitDetails?.visitorPhoto);
		const issuedPPEItems = parsePPEItems(visitDetails?.ppeItems);
		const isPPEMatchedOnCheckout =
			issuedPPEItems.length > 0 &&
			issuedPPEItems.length === selectedPPE.length &&
			issuedPPEItems.every((item) => selectedPPE.includes(item));
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
				{/* Back Button */}
				<button
					onClick={handleReset}
					className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 bg-white/80 backdrop-blur-sm hover:bg-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
					title="Go back"
				>
					<span className="text-xl">←</span>
				</button>

				<div className="w-full max-w-4xl">
					{/* Header */}
					<div className="text-center mb-8 md:mb-12">
						<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
							{isAlreadyCheckedIn ? 'Visitor Check-Out' : 'Visitor Check-In'}
						</h1>
						<p className="text-gray-600">Confirm visitor details and complete check-in</p>
					</div>

					{/* Main Card */}
					<div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
						{/* Visitor Card */}
						<div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 sm:p-8">
							<div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
								{/* Photo */}
								{visitorPhotoSrc && (
									<div className="flex justify-center sm:justify-start">
										<img
											src={visitorPhotoSrc}
											alt={visitDetails.visitorName}
											className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover border-4 border-white shadow-lg"
										/>
									</div>
								)}

								{/* Info */}
								<div className="flex-1 text-center sm:text-left">
									<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
										{visitDetails.visitorName}
									</h2>
									<div className="space-y-2 text-sm sm:text-base">
										<p className="flex items-center gap-2 justify-center sm:justify-start">
											<span>📧</span>
											<span className="break-all">{visitDetails.visitorEmail}</span>
										</p>
										<p className="flex items-center gap-2 justify-center sm:justify-start">
											<span>📱</span>
											{visitDetails.visitorMobile}
										</p>
										<p className="flex items-center gap-2 justify-center sm:justify-start font-semibold text-yellow-200">
											<span>🎯</span>
											{visitDetails.purpose}
										</p>
										<p className="flex items-center gap-2 justify-center sm:justify-start">
											<span>👤</span>
											<span>
												{visitDetails.hostEmployeeName} - {visitDetails.departmentName}
											</span>
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Form Section */}
						<div className="p-6 sm:p-8 space-y-6">
							{/* Gate Selection */}
							<div>
								<label className="block text-sm md:text-base font-semibold text-gray-700 mb-3">
									🚪 Entry Gate
								</label>
								<select
									value={selectedGate}
									onChange={(e) => setSelectedGate(e.target.value)}
									className="w-full px-4 sm:px-5 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-base"
								>
									<option>Main Gate</option>
									<option>Side Gate A</option>
									<option>Side Gate B</option>
									<option>Emergency Exit</option>
								</select>
							</div>

							{/* PPE Items */}
							<div>
								<label className="block text-sm md:text-base font-semibold text-gray-700 mb-2">
								📋 Items Given to Visitor
							</label>
							<p className="text-xs sm:text-sm text-gray-500 mb-3">
								{isAlreadyCheckedIn
									? '(Select PPE items being returned by visitor)'
									: '(Optional - Select one or more PPE items)'}
							</p>
							{isAlreadyCheckedIn && issuedPPEItems.length > 0 && (
								<div
									className={`mb-3 rounded-lg border p-3 ${
										isPPEMatchedOnCheckout
											? 'border-emerald-200 bg-emerald-50'
											: 'border-amber-200 bg-amber-50'
									}`}
								>
									<p className="text-xs sm:text-sm font-semibold text-gray-700">
										Issued at check-in: {issuedPPEItems.join(', ')}
									</p>
									<p className="text-xs mt-1 text-gray-600">
										{selectedPPE.length === 0
											? 'Select returned PPE items before check-out.'
											: isPPEMatchedOnCheckout
												? 'Returned PPE matches issued PPE.'
												: 'Returned PPE does not fully match issued PPE.'}
									</p>
								</div>
							)}
							<div className="border-2 border-gray-300 rounded-lg p-3 sm:p-4 bg-white">
								{ppeList.length === 0 ? (
									<p className="text-sm text-gray-500">Loading PPE items...</p>
								) : (
									<>
										<div className="flex flex-wrap gap-2 mb-3">
											<button
												type="button"
												onClick={handleSelectAllPPE}
												className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
											>
												Select All
											</button>
											<button
												type="button"
												onClick={handleClearPPE}
												className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
											>
												Clear
											</button>
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
											{ppeList.map((item) => {
												const isSelected = selectedPPE.includes(item.Name);
												return (
													<label
														key={item.ID}
														className={`flex items-center gap-3 rounded-md px-3 py-2 cursor-pointer border transition-colors ${
															isSelected
																? 'border-blue-500 bg-blue-50'
																: 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40'
														}`}
													>
														<input
															type="checkbox"
															checked={isSelected}
															onChange={() => handlePPEToggle(item.Name)}
															className="h-4 w-4 accent-blue-600"
														/>
														<span className="text-sm sm:text-base text-gray-800">{item.Name}</span>
													</label>
												);
											})}
										</div>
									</>
								)}
							</div>
							{selectedPPE.length > 0 && (
								<div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
									<p className="text-xs sm:text-sm text-blue-700 font-semibold">
										Selected: {selectedPPE.join(', ')}
									</p>
								</div>
							)}
							</div>
							{error && (
								<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
									<div className="flex gap-3">
										<span className="text-2xl">⚠️</span>
										<div>
											<h3 className="font-bold text-red-700">Error</h3>
											<p className="text-red-600 text-sm">{error}</p>
										</div>
										<button
											onClick={() => setError('')}
											className="ml-auto text-red-500 hover:text-red-700 font-bold text-lg"
										>
											✕
										</button>
									</div>
								</div>
							)}

							{/* Action Buttons */}
							<div className="flex flex-col sm:flex-row gap-4 pt-4">
								<button
									onClick={handleVisitAction}
									disabled={isCheckingIn}
								className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 text-base sm:text-lg shadow-lg"
								>
									{isCheckingIn
										? isAlreadyCheckedIn
											? '⏳ Checking out...'
											: '⏳ Checking in...'
										: isAlreadyCheckedIn
											? '✓ Check-Out'
											: '✓ Check-In'}
								</button>
								<button
									onClick={handleReset}
									className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-4 px-6 rounded-lg transition-all duration-300 text-base sm:text-lg"
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

	// Welcome/Idle Screen
	if (mode === 'idle') {
		return (
			<div className="min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center p-4 sm:p-6 md:p-8">
				<div className="w-full max-w-4xl">
					{/* Logo & Company Name */}
					<div className="text-center mb-12 md:mb-16 animate-fade-in">
						<div className="inline-block bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-full mb-6 border border-white/20">
							<span className="text-6xl sm:text-7xl md:text-8xl block">🏢</span>
						</div>
						<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
							Visitor Management System
						</h1>
						<p className="text-blue-200 text-base sm:text-lg">Professional Access Control</p>
					</div>

					{/* Welcome Message */}
					<div className="text-center mb-12 md:mb-16">
						<h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
							Welcome to Our Facility
						</h2>
						<p className="text-gray-300 text-base sm:text-lg">
							Please check in using one of the options below
						</p>
					</div>

					{/* Option Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12">
						{/* QR Code Option */}
						<button
							onClick={() => setMode('qr')}
							className="group relative bg-white/95 backdrop-blur-sm hover:bg-white rounded-2xl p-8 sm:p-10 shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-3xl border border-white/20 overflow-hidden"
						>
							{/* Gradient Background */}
							<div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-300"></div>

							<div className="relative z-10">
								<div className="text-6xl sm:text-7xl mb-4 block transform group-hover:scale-110 transition-transform duration-300">
									📱
								</div>
								<h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
									Scan QR Code
								</h3>
								<p className="text-gray-600 text-sm sm:text-base leading-relaxed">
									Use your smartphone or kiosk to scan the QR code from your booking confirmation
								</p>
							</div>

							{/* Hover Border */}
							<div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500 rounded-2xl transition-all duration-300"></div>
						</button>

						{/* Manual Code Option */}
						<button
							onClick={() => setMode('manual')}
							className="group relative bg-white/95 backdrop-blur-sm hover:bg-white rounded-2xl p-8 sm:p-10 shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-3xl border border-white/20 overflow-hidden"
						>
							{/* Gradient Background */}
							<div className="absolute inset-0 bg-gradient-to-b from-purple-500/0 to-purple-600/0 group-hover:from-purple-500/10 group-hover:to-purple-600/10 transition-all duration-300"></div>

							<div className="relative z-10">
								<div className="text-6xl sm:text-7xl mb-4 block transform group-hover:scale-110 transition-transform duration-300">
									🔢
								</div>
								<h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
									Enter Reference Code
								</h3>
								<p className="text-gray-600 text-sm sm:text-base leading-relaxed">
									Type your reference number received via email or SMS
								</p>
							</div>

							{/* Hover Border */}
							<div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500 rounded-2xl transition-all duration-300"></div>
						</button>
					</div>

					{/* Help Section */}
					

					{/* Footer */}
					<div className="text-center mt-12 text-gray-400 text-xs sm:text-sm">
						<p>Secure Visitor Management System • 2024</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 md:p-8">
			{/* Back Button */}
			<button
				onClick={handleReset}
				className="fixed top-4 left-4 sm:top-6 sm:left-6 z-50 bg-white/80 backdrop-blur-sm hover:bg-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
				title="Go back"
			>
				<span className="text-xl">←</span>
			</button>

			<div className="w-full max-w-4xl">
				{/* Header */}
				<div className="text-center mb-8 md:mb-12">
					<h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
						🏢 Visitor Check-In
					</h1>
					<p className="text-gray-600">
						{mode === 'qr' ? 'Scan your QR code' : 'Enter your reference code'}
					</p>
				</div>

				{/* Mode Selector Tabs */}
				<div className="flex gap-3 sm:gap-4 mb-8 justify-center">
					<button
						onClick={() => {
							stopCamera();
							setMode('qr');
						}}
						className={`px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold transition-all duration-300 text-base sm:text-lg ${
							mode === 'qr'
								? 'bg-blue-600 text-white shadow-lg scale-105'
								: 'bg-white text-gray-700 border-2 border-gray-300 hover:border-blue-500'
						}`}
					>
						📱 Scan QR Code
					</button>
					<button
						onClick={() => {
							stopCamera();
							setMode('manual');
						}}
						className={`px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold transition-all duration-300 text-base sm:text-lg ${
							mode === 'manual'
								? 'bg-purple-600 text-white shadow-lg scale-105'
								: 'bg-white text-gray-700 border-2 border-gray-300 hover:border-purple-500'
						}`}
					>
						⌨️ Enter Code
					</button>
				</div>

				{/* Main Content Card */}
				<div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
					{mode === 'qr' ? (
						<div className="p-6 sm:p-8 md:p-10">
							{/* Camera Container */}
							<div className="relative w-full bg-black rounded-xl overflow-hidden mb-6 aspect-video border-4 border-blue-300">
								<video
									ref={videoRef}
									autoPlay
									playsInline
									className="w-full h-full object-cover"
								/>
								<canvas ref={canvasRef} className="hidden" />

								{/* Scanner Overlay */}
								<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
									<div className="relative w-64 h-64">
										{/* Main Frame */}
										<div className="absolute inset-0 border-4 border-blue-400 rounded-2xl opacity-80 animate-pulse"></div>

										{/* Corner Accents */}
										<div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
										<div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
										<div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
										<div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
									</div>
								</div>

								{/* Scanning Indicator */}
								{isScanning && (
									<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
										<p className="text-white font-semibold text-center text-base sm:text-lg animate-pulse">
											📷 Scanning for QR code...
										</p>
									</div>
								)}
							</div>

							{/* Stop Camera Button */}
							<button
								onClick={stopCamera}
								className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 sm:py-4 px-6 rounded-lg transition-all duration-300 text-base sm:text-lg shadow-lg"
							>
								⏹️ Stop Camera
							</button>
						</div>
					) : (
						<div className="p-6 sm:p-8 md:p-10">
							{/* Reference Code Input */}
							<div>
								<label className="block text-sm md:text-base font-semibold text-gray-700 mb-4">
									📝 Reference Code
								</label>
								<input
									type="text"
									value={manualCode}
									onChange={(e) => setManualCode(e.target.value.toUpperCase())}
									onKeyPress={(e) => {
										if (e.key === 'Enter') handleManualCodeSubmit();
									}}
									placeholder="e.g., VMS-2024-00001"
									autoFocus
									className="w-full px-5 sm:px-6 py-4 sm:py-5 border-3 border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all text-lg sm:text-xl font-mono font-bold letter-spacing tracking-wider"
								/>
								<p className="text-gray-500 text-xs sm:text-sm mt-2">
									Enter the code you received via email or SMS
								</p>
							</div>

							{/* Submit Button */}
							<button
								onClick={handleManualCodeSubmit}
								className="w-full mt-8 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-4 sm:py-5 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 text-base sm:text-lg shadow-lg"
							>
								🔍 Look Up
							</button>
						</div>
					)}

					{/* Error Message */}
					{error && (
						<div className="bg-red-50 border-t-4 border-red-500 p-4 sm:p-6">
							<div className="flex gap-3 sm:gap-4">
								<span className="text-2xl sm:text-3xl shrink-0">⚠️</span>
								<div className="flex-1">
									<h3 className="font-bold text-red-700">Error</h3>
									<p className="text-red-600 text-sm sm:text-base">{error}</p>
								</div>
								<button
									onClick={() => setError('')}
									className="text-red-500 hover:text-red-700 font-bold text-lg shrink-0"
								>
									✕
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Help Section */}
				<div className="mt-8 sm:mt-10 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-5 sm:p-6">
					<p className="text-gray-700 text-sm sm:text-base">
						<strong>Don't have a code?</strong> Contact the receptionist at the main desk for assistance.
					</p>
				</div>
			</div>
		</div>
	);
};
export default GateEntryKiosk;
