
import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const [step, setStep] = useState(1); // 1: 薬剤識別, 2: 識別結果確認, 3: 処方箋照合
  const [drugImageFile, setDrugImageFile] = useState(null);
  const [drugImagePreview, setDrugImagePreview] = useState(null);
  const [prescriptionImageFile, setPrescriptionImageFile] = useState(null);
  const [prescriptionImagePreview, setPrescriptionImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [identifiedDrugs, setIdentifiedDrugs] = useState([]);
  const [selectedTiming, setSelectedTiming] = useState('朝');
  const drugInputRef = useRef(null);
  const prescriptionInputRef = useRef(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleDrugImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDrugImageFile(file);
      setDrugImagePreview(URL.createObjectURL(file));
      setResult(null); 
      setError(null);
    }
  };

  const handlePrescriptionImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPrescriptionImageFile(file);
      setPrescriptionImagePreview(URL.createObjectURL(file));
      setResult(null); 
      setError(null);
    }
  };

  const handleIdentifyDrug = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (!drugImageFile) {
      setError("薬剤の画像を選択してください。");
      setLoading(false);
      return;
    }

    try {
      const base64Image = await toBase64(drugImageFile);
      const mimeType = drugImageFile.type;

      const response = await fetch('http://localhost:5001/api/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData: base64Image, mimeType }),
      });

      const data = await response.json();

      if (response.ok) {
        setIdentifiedDrugs(data.identifiedDrugs);
        setResult({ message: data.rawResponse });
        setStep(2); // Move to step 2 (確認モード)
      } else {
        setError(data.error || "薬剤の識別中にエラーが発生しました。");
      }
    } catch (err) {
      console.error("Error identifying drug:", err);
      setError("薬剤の識別中にエラーが発生しました。ネットワーク接続を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPrescription = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    if (!prescriptionImageFile || identifiedDrugs.length === 0) {
      setError("処方箋の画像と識別された薬剤情報が必要です。");
      setLoading(false);
      return;
    }

    try {
      const base64PrescriptionImage = await toBase64(prescriptionImageFile);
      const prescriptionMimeType = prescriptionImageFile.type;

      const response = await fetch('http://localhost:5001/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifiedDrugs,
          prescriptionImageData: base64PrescriptionImage,
          prescriptionMimeType,
          timing: selectedTiming,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.error || "処方箋の照合中にエラーが発生しました。");
      }
    } catch (err) {
      console.error("Error verifying prescription:", err);
      setError("処方箋の照合中にエラーが発生しました。ネットワーク接続を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const resetApplication = () => {
    setStep(1);
    setDrugImageFile(null);
    setDrugImagePreview(null);
    setPrescriptionImageFile(null);
    setPrescriptionImagePreview(null);
    setLoading(false);
    setResult(null);
    setError(null);
    setIdentifiedDrugs([]);
    setSelectedTiming('朝');
  };

  const handleViewDrugDetails = async (drugName) => {
    setModalTitle(`${drugName} の詳細情報`);
    setModalContent('情報を取得中...');
    setIsModalOpen(true);
    setLoading(true);

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/drug-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drugName }),
      });

      const data = await response.json();

      if (response.ok) {
        setModalContent(data.details);
      } else {
        setModalContent(`情報の取得に失敗しました: ${data.error}`);
      }
    } catch (err) {
      console.error("Error fetching drug details:", err);
      setModalContent('情報の取得中にエラーが発生しました。ネットワーク接続を確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      <header className="bg-gray-800 p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center text-blue-400">薬剤識別・処方箋照合AI</h1>
      </header>

      <main className="flex-grow p-8 flex flex-col items-center justify-center">
        {loading && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
            <p className="ml-4 text-xl">処理中...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-800 p-4 rounded-md mb-4 text-center w-full max-w-md">
            <p>{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-center">ステップ1：薬剤の識別</h2>
            <div className="mb-6">
              <input
                type="file"
                accept="image/*"
                onChange={handleDrugImageChange}
                className="hidden"
                ref={drugInputRef}
              />
              {drugImagePreview ? (
                <div className="mb-4 text-center">
                  <img src={drugImagePreview} alt="薬剤プレビュー" className="max-h-48 w-auto inline-block rounded-lg shadow-md" />
                  <p className="mt-2 text-sm text-gray-400">選択中のファイル: {drugImageFile?.name}</p>
                </div>
              ) : (
                <div className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-700 mb-4">
                  <p className="text-gray-400">ここに画像プレビューが表示されます</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button 
                  onClick={() => { drugInputRef.current.capture = ''; drugInputRef.current.click(); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg text-base transition-transform transform hover:scale-105"
                >
                  ファイル選択
                </button>
                <button 
                  onClick={() => { drugInputRef.current.capture = 'environment'; drugInputRef.current.click(); }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg text-base transition-transform transform hover:scale-105"
                >
                  カメラで撮影
                </button>
              </div>
            </div>
            <button
              onClick={handleIdentifyDrug}
              disabled={!drugImageFile || loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-xl transition-transform transform hover:scale-105"
            >
              {loading ? "識別中..." : "薬剤を識別する"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-center">識別結果の確認</h2>
            {identifiedDrugs.length > 0 ? (
              <div className="mb-4 p-4 bg-gray-700 rounded-md">
                <h3 className="font-semibold mb-2 text-blue-300">識別された薬剤:</h3>
                <ul className="space-y-2">
                  {identifiedDrugs.map((drug, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                      <span className="text-gray-300">{drug.name} ({drug.quantity})</span>
                      <button 
                        onClick={() => handleViewDrugDetails(drug.name)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded-md"
                      >
                        詳細
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mb-4 p-4 bg-yellow-800 text-yellow-200 rounded-md">
                <p>薬剤の識別ができませんでした。画像を再スキャンしてください。</p>
              </div>
            )}
            <div className="flex justify-between space-x-4">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-lg text-lg"
              >
                確認して次へ
              </button>
              <button
                onClick={resetApplication}
                className="flex-1 bg-blue-800 hover:bg-blue-700 text-white font-bold py-4 px-4 rounded-lg text-lg"
              >
                再スキャン
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-6 text-center">ステップ2：処方箋との照合</h2>
            {identifiedDrugs.length > 0 && (
              <div className="mb-4 p-3 bg-gray-700 rounded-md">
                <h3 className="font-semibold mb-2 text-blue-300">識別された薬剤:</h3>
                <ul className="space-y-2">
                  {identifiedDrugs.map((drug, index) => (
                    <li key={index} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                      <span className="text-gray-300">{drug.name} ({drug.quantity})</span>
                      <button 
                        onClick={() => handleViewDrugDetails(drug.name)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded-md"
                      >
                        詳細
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handlePrescriptionImageChange}
                className="hidden"
                ref={prescriptionInputRef}
              />
              {prescriptionImagePreview ? (
                <div className="mb-4 text-center">
                  <img src={prescriptionImagePreview} alt="処方箋プレビュー" className="max-h-48 w-auto inline-block rounded-lg shadow-md" />
                  <p className="mt-2 text-sm text-gray-400">選択中のファイル: {prescriptionImageFile?.name}</p>
                </div>
              ) : (
                <div className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center bg-gray-700 mb-4">
                  <p className="text-gray-400">ここに画像プレビューが表示されます</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button 
                  onClick={() => { prescriptionInputRef.current.capture = ''; prescriptionInputRef.current.click(); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg text-base transition-transform transform hover:scale-105"
                >
                  ファイル選択
                </button>
                <button 
                  onClick={() => { prescriptionInputRef.current.capture = 'environment'; prescriptionInputRef.current.click(); }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 px-4 rounded-lg text-base transition-transform transform hover:scale-105"
                >
                  カメラで撮影
                </button>
              </div>
            </div>
            <div className="mb-6">
              <label htmlFor="timing-select" className="block text-sm font-medium text-gray-300 mb-2">
                服用タイミング
              </label>
              <select 
                id="timing-select" 
                className="bg-gray-700 text-white p-3 rounded-lg w-full text-base focus:ring-blue-500 focus:border-blue-500"
                value={selectedTiming}
                onChange={(e) => setSelectedTiming(e.target.value)}
              >
                <option>朝</option>
                <option>昼</option>
                <option>夕</option>
                <option>眠前</option>
                <option>タイミング指定なし</option>
              </select>
            </div>
            <button
              onClick={handleVerifyPrescription}
              disabled={!prescriptionImageFile || identifiedDrugs.length === 0 || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-5 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-xl transition-transform transform hover:scale-105"
            >
              {loading ? "照合中..." : "照合実行"}
            </button>
            <button
              onClick={resetApplication}
              className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-4 rounded-lg text-lg transition-transform transform hover:scale-105"
            >
              リセット / 新しいスキャンを開始
            </button>

            {result && result.overallStatus && (
              <div className="mt-8 p-6 bg-gray-700 rounded-lg shadow-inner">
                <h3 className="text-xl font-semibold mb-4 text-blue-300">照合結果</h3>
                <p className={`text-2xl font-bold mb-4 text-${result.overallStatusColor}-400`}>
                  総合評価: {result.overallStatus}
                </p>
                <p className="mb-6 text-gray-300">{result.summary}</p>

                <h4 className="font-semibold mb-2 text-blue-300">識別された薬剤リスト:</h4>
                <ul className="list-disc list-inside mb-6 text-gray-300">
                  {result.identifiedDrugs && result.identifiedDrugs.map((drug, index) => (
                    <li key={index}>{drug.name} ({drug.quantity})</li>
                  ))}
                </ul>

                <h4 className="font-semibold mb-2 text-blue-300">処方箋から読み取った薬剤リスト:</h4>
                <ul className="space-y-2 mb-6">
                  {result.prescriptionDrugs && result.prescriptionDrugs.map((drug, index) => (
                     <li key={index} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg">
                      <span className="text-gray-300">{drug.name} ({drug.quantity}) - {drug.timing}</span>
                      <button 
                        onClick={() => handleViewDrugDetails(drug.name)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded-md"
                      >
                        詳細
                      </button>
                    </li>
                  ))}
                </ul>

                <h4 className="font-semibold mb-2 text-blue-300">詳細な比較:</h4>
                {result.comparison && result.comparison.map((comp, index) => (
                  <div key={index} className={`p-4 rounded-lg mb-4 ${comp.match ? "bg-gray-600" : "bg-red-900 border border-red-600"}`}>
                    <p className="text-gray-200">
                      <span className="font-bold text-blue-200">識別:</span> {comp.identifiedName}
                    </p>
                    <p className="text-gray-200">
                      <span className="font-bold text-blue-200">処方箋:</span> {comp.prescriptionName}
                    </p>
                    {!comp.match && (
                      <p className="text-red-400 font-bold mt-2">警告: 不一致箇所があります！ {comp.warning}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <header className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-blue-400">{modalTitle}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </header>
            <div className="p-6 overflow-y-auto">
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: modalContent.replace(/\n/g, '<br />') }} />
            </div>
            <footer className="p-4 border-t border-gray-700 text-right">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
              >
                閉じる
              </button>
            </footer>
          </div>
        </div>
      )}

      <footer className="bg-gray-800 p-4 text-center text-xs text-gray-400 w-full">
        <p>このAIツールは補助的なものであり、最終的な確認は必ず医療専門家自身が行うこと。</p>
      </footer>
    </div>
  );
}

export default App;
