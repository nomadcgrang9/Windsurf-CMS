import { useState } from 'react';
import { getTodaysClassPoints, updateClassGoal } from '../../services/pointService';
import { parseClassText } from '../../utils/formatUtils';

function AdminClassPointsTab() {
  const [searchQuery, setSearchQuery] = useState('');
  const [classData, setClassData] = useState(null);
  const [goalInput, setGoalInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchedGrade, setSearchedGrade] = useState(null);
  const [searchedClass, setSearchedClass] = useState(null);

  const handleSearch = async () => {
    setError('');
    setClassData(null);
    setIsLoading(true);
    try {
      const { grade, classNumber } = parseClassText(searchQuery);
      const data = await getTodaysClassPoints(grade, classNumber);
      setClassData(data);
      setGoalInput(data.goal_points);
      setSearchedGrade(grade);
      setSearchedClass(classNumber);
    } catch (err) {
      setError('학급 형식이 올바르지 않습니다. (예: 3-1)');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGoal = async () => {
    if (!searchedGrade || !searchedClass) return;
    const newGoal = parseInt(goalInput, 10);
    if (isNaN(newGoal) || newGoal < 0) {
      alert('유효한 목표 포인트를 입력하세요.');
      return;
    }

    try {
      await updateClassGoal(searchedGrade, searchedClass, newGoal);
      setClassData(prev => ({ ...prev, goal_points: newGoal }));
      alert('목표 포인트가 성공적으로 저장되었습니다.');
    } catch (err) {
      alert('목표 포인트 저장 중 오류가 발생했습니다.');
      console.error(err);
    }
  };

  // 스타일 객체들
  const viewContainerStyle = {
    paddingTop: '16px',
  };

  const searchContainerStyle = {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  };

  const inputStyle = {
    flex: 1,
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #E0E0E0',
    borderRadius: '8px',
  };

  const buttonStyle = {
    padding: '12px 32px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
    background: isLoading ? '#ccc' : '#667eea',
    border: 'none',
    borderRadius: '8px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
  };

  const resultContainerStyle = {
    padding: '20px',
    border: '1px solid #E0E0E0',
    borderRadius: '8px',
    background: '#FAFAFA',
  };

  return (
    <div style={viewContainerStyle}>
       <p style={{ fontSize: '14px', color: '#666', margin: '0 0 16px 0' }}>
        학급을 입력하여 우리반의 누적 포인트 현황을 보고, 목표를 수정하세요.
      </p>
      <div style={searchContainerStyle}>
        <input
          type="text"
          placeholder="학급 입력 (예: 3-1)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          style={inputStyle}
        />
        <button onClick={handleSearch} style={buttonStyle} disabled={isLoading}>
          {isLoading ? '조회 중...' : '조회'}
        </button>
      </div>

      {error && <p style={{ color: '#E74C3C', textAlign: 'center' }}>{error}</p>}

      {classData && (
        <div style={resultContainerStyle}>
          <h5 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>{`${searchedGrade}학년 ${searchedClass}반 현황`}</h5>
          <p style={{ fontSize: '16px', margin: '0 0 12px 0' }}>
            <strong>오늘 누적 포인트:</strong> {classData.current_points} 점
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label htmlFor="goal-points-input" style={{ fontSize: '16px' }}>
              <strong>목표 포인트 설정:</strong>
            </label>
            <input
              id="goal-points-input"
              type="number"
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              style={{ ...inputStyle, flex: 'none', width: '100px' }}
            />
            <button onClick={handleUpdateGoal} style={{ ...buttonStyle, padding: '8px 24px' }}>
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminClassPointsTab;
