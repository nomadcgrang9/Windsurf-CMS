import { useState, useEffect } from 'react';
import { getStudentsByClass } from '../../services/studentService';
import { getDailyPoints, updateDailyPoints } from '../../services/pointService';
import { supabase } from '../../services/supabaseClient';
import AdminClassPointsTab from './AdminClassPointsTab'; // 새로 만든 컴포넌트 import

// --- 기존 개인별 포인트 관리 UI를 별도 컴포넌트로 분리 ---
const IndividualPointsView = () => {
  const [classInfo, setClassInfo] = useState('');
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPoints, setEditingPoints] = useState({});

  const handleFetchClass = async () => {
    if (!classInfo.trim()) {
      setMessage('❌ 학급을 입력해주세요 (예: 3-1)');
      return;
    }
    const parts = classInfo.split('-');
    if (parts.length !== 2) {
      setMessage('❌ 올바른 형식으로 입력해주세요 (예: 3-1, 4-2)');
      return;
    }
    const grade = parseInt(parts[0]);
    const classNum = parseInt(parts[1]);
    if (![3, 4, 6].includes(grade)) {
      setMessage('❌ 학년은 3, 4, 6만 가능합니다');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const studentList = await getStudentsByClass(grade, classNum);
      if (studentList.length === 0) {
        setMessage(`⚠️ ${classInfo} 학급에 등록된 학생이 없습니다.`);
        setStudents([]);
        setLoading(false);
        return;
      }
      const studentsWithPoints = await Promise.all(
        studentList.map(async (student) => {
          try {
            const points = await getDailyPoints(student.student_id);
            return { ...student, current_points: points?.current_points || 0, max_points: points?.max_points || 20 };
          } catch (error) {
            console.error(`${student.student_id} 포인트 조회 실패:`, error);
            return { ...student, current_points: 0, max_points: 20 };
          }
        })
      );
      setStudents(studentsWithPoints);
      const initialPoints = {};
      studentsWithPoints.forEach(s => { initialPoints[s.student_id] = s.current_points; });
      setEditingPoints(initialPoints);
      setMessage(`✅ ${classInfo} 학급 ${studentsWithPoints.length}명 조회 완료`);
    } catch (error) {
      console.error('학급 조회 오류:', error);
      setMessage('❌ 학급 조회 중 오류가 발생했습니다.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePointsChange = (studentId, value) => {
    const points = parseInt(value);
    if (isNaN(points) || points < 0 || points > 20) return;
    setEditingPoints(prev => ({ ...prev, [studentId]: points }));
  };

  const handleUpdateStudent = async (studentId, studentName) => {
    const newPoints = editingPoints[studentId];
    if (newPoints === undefined || newPoints < 0 || newPoints > 20) {
      alert('포인트는 0-20 사이의 숫자여야 합니다.');
      return;
    }
    try {
      await updateDailyPoints(studentId, newPoints);
      setStudents(prev => prev.map(s => s.student_id === studentId ? { ...s, current_points: newPoints } : s));
      setMessage(`✅ ${studentName}(${studentId})의 포인트가 ${newPoints}로 업데이트되었습니다.`);
    } catch (error) {
      console.error('포인트 업데이트 오류:', error);
      alert('포인트 업데이트에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (students.length === 0) return;
    const subscription = supabase
      .channel(`daily_points_admin_individual_${classInfo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_points' }, (payload) => {
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const updatedStudentId = payload.new.student_id;
          const isInCurrentList = students.some(s => s.student_id === updatedStudentId);
          if (isInCurrentList) {
            setStudents(prev => prev.map(s => s.student_id === updatedStudentId ? { ...s, current_points: payload.new.current_points } : s));
            setEditingPoints(prev => ({ ...prev, [updatedStudentId]: payload.new.current_points }));
          }
        }
      })
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [students]);

  const averagePoints = students.length > 0 ? (students.reduce((sum, s) => sum + s.current_points, 0) / students.length).toFixed(1) : 0;

  return (
    <div>
      <p style={{ fontSize: '14px', color: '#666', margin: '16px 0' }}>
        학급을 입력하여 전체 학생의 포인트를 조회하고 수정하세요.
      </p>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <input
          type="text"
          value={classInfo}
          onChange={(e) => setClassInfo(e.target.value)}
          placeholder="학급 입력 (예: 3-1, 4-2, 6-7)"
          style={{ flex: 1, padding: '12px 16px', fontSize: '16px', border: '2px solid #E0E0E0', borderRadius: '8px' }}
          onKeyPress={(e) => { if (e.key === 'Enter') handleFetchClass(); }}
        />
        <button onClick={handleFetchClass} disabled={loading} style={{ padding: '12px 32px', fontSize: '16px', fontWeight: 600, color: 'white', background: loading ? '#ccc' : '#667eea', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {loading ? '조회 중...' : '조회'}
        </button>
      </div>
      {message && <div style={{ padding: '16px', borderRadius: '8px', background: '#E8F5E9', color: '#2E7D32', marginBottom: '24px' }}>{message}</div>}
      {students.length > 0 && (
        <div style={{ border: '1px solid #E0E0E0', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', background: '#F5F5F5', display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '18px', margin: 0 }}>{classInfo} 학생 목록</h3>
            <div style={{ fontSize: '14px' }}>총 {students.length}명 | 평균 포인트: {averagePoints}</div>
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 20px', textAlign: 'left', width: '15%' }}>학번</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', width: '20%' }}>이름</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', width: '25%' }}>현재 포인트</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', width: '25%' }}>포인트 수정</th>
                  <th style={{ padding: '12px 20px', textAlign: 'center', width: '15%' }}>작업</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.student_id}>
                    <td style={{ padding: '12px 20px' }}>{student.student_id}</td>
                    <td style={{ padding: '12px 20px' }}>{student.name}</td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: student.current_points >= 20 ? '#E74C3C' : '#667eea' }}>
                        {student.current_points} / {student.max_points}
                      </span>
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <input type="number" value={editingPoints[student.student_id] ?? student.current_points} onChange={(e) => handlePointsChange(student.student_id, e.target.value)} min="0" max="20" style={{ width: '80px', padding: '8px', textAlign: 'center' }} />
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                      <button onClick={() => handleUpdateStudent(student.student_id, student.name)} style={{ padding: '6px 16px', fontSize: '13px', color: 'white', background: '#667eea', border: 'none', borderRadius: '6px' }}>수정</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};


// --- 메인 탭 컴포넌트 ---
function AdminPointsTab() {
  const [activeSubTab, setActiveSubTab] = useState('individual'); // 'individual' or 'class'

  const tabButtonStyle = (isActive) => ({
    padding: '10px 20px',
    fontSize: '16px',
    fontWeight: isActive ? 'bold' : 'normal',
    color: isActive ? '#fff' : '#333',
    backgroundColor: isActive ? '#7BA8B0' : '#f0f0f0',
    border: 'none',
    borderBottom: isActive ? '3px solid #667eea' : '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#333', marginBottom: '20px' }}>
        🎯 포인트 관리
      </h2>

      {/* 하위 탭 버튼 */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd' }}>
        <button 
          style={tabButtonStyle(activeSubTab === 'individual')}
          onClick={() => setActiveSubTab('individual')}
        >
          개인별 포인트
        </button>
        <button 
          style={tabButtonStyle(activeSubTab === 'class')}
          onClick={() => setActiveSubTab('class')}
        >
          우리반 포인트
        </button>
      </div>

      {/* 선택된 탭 컨텐츠 */}
      {activeSubTab === 'individual' ? <IndividualPointsView /> : <AdminClassPointsTab />}
    </div>
  );
}

export default AdminPointsTab;
