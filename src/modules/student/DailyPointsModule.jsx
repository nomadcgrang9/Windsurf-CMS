import { useState, useEffect, useCallback } from 'react';
import { getDailyPoints, incrementPoints, getTodaysClassPoints } from '../../services/pointService';
import { supabase } from '../../services/supabaseClient';
import { parseStudentId } from '../../utils/formatUtils';
import styles from './DailyPointsModule.module.css';

function DailyPointsModule() {
  const [currentPoints, setCurrentPoints] = useState(0);
  const [maxPoints, setMaxPoints] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showMinusModal, setShowMinusModal] = useState(false);
  const [subtracting, setSubtracting] = useState(false);

  const [classPoints, setClassPoints] = useState({ current: 0, goal: 100 });
  const [classPointsLoading, setClassPointsLoading] = useState(false);

  const percentage = (currentPoints / maxPoints) * 100;
  const classPercentage = (classPoints.current / classPoints.goal) * 100;

  const fetchPoints = async () => {
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        setError('로그인 정보를 찾을 수 없습니다.');
        return;
      }
      const points = await getDailyPoints(studentId);
      if (points) {
        setCurrentPoints(points.current_points);
        setMaxPoints(points.max_points);
        setError(null);
      }
    } catch (err) {
      console.error('포인트 조회 오류:', err);
      setError('포인트를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassPoints = useCallback(async () => {
    setClassPointsLoading(true);
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) return;
      const { grade, classNumber } = parseStudentId(studentId);
      const data = await getTodaysClassPoints(grade, classNumber);
      setClassPoints({ current: data.current_points, goal: data.goal_points });
    } catch (err) {
      console.error('우리반 포인트 조회 오류:', err);
    } finally {
      setClassPointsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoints();
    const studentId = localStorage.getItem('studentId');
    if (!studentId) return;

    const channel = supabase
      .channel('daily_points_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_points', filter: `student_id=eq.${studentId}` },
        (payload) => {
          if (payload.new) {
            setCurrentPoints(payload.new.current_points);
            setMaxPoints(payload.new.max_points);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isFlipped) {
      fetchClassPoints();
    }
  }, [isFlipped, fetchClassPoints]);

  const isMaxReached = currentPoints >= maxPoints;

  const handlePlusClick = (e) => {
    e.stopPropagation();
    if (isMaxReached) {
      alert('오늘의 포인트 한도에 도달했습니다!');
      return;
    }
    setShowModal(true);
  };

  const handleMinusClick = (e) => {
    e.stopPropagation();
    if (currentPoints <= 0) {
      alert('포인트가 0입니다.');
      return;
    }
    setShowMinusModal(true);
  };

  const handleMinusConfirm = async () => {
    setSubtracting(true);
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        alert('로그인 정보를 찾을 수 없습니다.');
        return;
      }
      await incrementPoints(studentId, -1);
      setShowMinusModal(false);
      fetchClassPoints();
    } catch (error) {
      console.error('포인트 감소 오류:', error);
      alert('포인트 감소 중 오류가 발생했습니다.');
    } finally {
      setSubtracting(false);
    }
  };

  const handleMinusCancel = () => {
    setShowMinusModal(false);
  };

  const handleConfirm = async () => {
    setAdding(true);
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        alert('로그인 정보를 찾을 수 없습니다.');
        return;
      }
      await incrementPoints(studentId, 1);
      setShowModal(false);
      fetchClassPoints(); // 우리반 포인트 갱신
    } catch (error) {
      console.error('포인트 추가 오류:', error);
      alert('포인트 추가 중 오류가 발생했습니다.');
    } finally {
      setAdding(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
  };

  const handleCardClick = (e) => {
    if (showModal || e.target.closest('button')) return;
    setIsFlipped(!isFlipped);
  };

  const titleStyle = {
    fontFamily: "'DaHyun', 'Pretendard', sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    color: '#333333',
    marginBottom: '16px',
    flexShrink: 0
  };

  return (
    <>
      <div className={`${styles.flipContainer} ${isFlipped ? styles.flipped : ''}`} onClick={handleCardClick}>
        <div className={styles.flipper}>
          {/* --- 앞면 --- */}
          <div className={styles.cardFront}>
            <div style={{ width: '100%', position: 'relative' }}>
              {!loading && !error && (
                <div style={{ position: 'absolute', top: '-12px', right: '-12px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleMinusClick}
                    disabled={currentPoints <= 0}
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '24px',
                      fontWeight: 700,
                      color: currentPoints <= 0 ? '#ccc' : '#E74C3C',
                      cursor: currentPoints <= 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    −
                  </button>
                  <button
                    onClick={handlePlusClick}
                    disabled={isMaxReached}
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '24px',
                      fontWeight: 700,
                      color: isMaxReached ? '#ccc' : '#B8D4D9',
                      cursor: isMaxReached ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    +
                  </button>
                </div>
              )}
              <h3 style={titleStyle}>오늘의 포인트</h3>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#999' }}>불러오는 중...</div>
            ) : error ? (
              <div style={{ color: '#E74C3C', textAlign: 'center' }}>{error}</div>
            ) : (
              <>
                <div style={{
                  fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                  fontSize: '36px',
                  fontWeight: 900,
                  color: isMaxReached ? '#E74C3C' : '#7BA8B0',
                  marginBottom: '16px',
                  transition: 'color 0.3s ease'
                }}>
                  {currentPoints} / {maxPoints}
                </div>
                <div style={{
                  width: '100%',
                  height: '24px',
                  background: 'rgba(184, 212, 217, 0.15)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: isMaxReached ? '2px solid #E74C3C' : 'none'
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: isMaxReached ? '#E74C3C' : '#B8D4D9',
                    transition: 'width 0.5s ease, background 0.3s ease'
                  }} />
                </div>
                {isMaxReached && (
                  <div style={{
                    fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                    fontSize: '14px',
                    color: '#E74C3C',
                    marginTop: '8px',
                    textAlign: 'center',
                    fontWeight: 600
                  }}>
                    오늘의 한도에 도달했습니다!
                  </div>
                )}
              </>
            )}
          </div>

          {/* --- 뒷면 --- */}
          <div className={styles.cardBack}>
            <h3 style={titleStyle}>우리반 포인트</h3>
            {classPointsLoading ? (
              <div style={{ textAlign: 'center', color: '#999' }}>불러오는 중...</div>
            ) : (
              <>
                <div style={{
                  fontFamily: "'DaHyun', 'Pretendard', sans-serif",
                  fontSize: '36px',
                  fontWeight: 900,
                  color: '#7BA8B0',
                  marginBottom: '16px',
                }}>
                  {classPoints.current} / {classPoints.goal}
                </div>
                <div style={{
                  width: '100%',
                  height: '24px',
                  background: 'rgba(184, 212, 217, 0.15)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${classPercentage}%`,
                    height: '100%',
                    background: '#B8D4D9',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 경고 모달 */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '16px'
            }}>
              포인트 추가 확인
            </h3>
            <p style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '24px'
            }}>
              포인트 추가는 선생님께서<br />
              미리 허락하신 경우만 가능합니다.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={handleCancel} disabled={adding} style={{ flex: 1, padding: '12px 24px', fontSize: '16px', fontWeight: 600, fontFamily: "'DaHyun', 'Pretendard', sans-serif", color: '#666', background: 'white', border: '2px solid #E0E0E0', borderRadius: '8px', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleConfirm} disabled={adding} style={{ flex: 1, padding: '12px 24px', fontSize: '16px', fontWeight: 600, fontFamily: "'DaHyun', 'Pretendard', sans-serif", color: 'white', background: adding ? '#ccc' : '#B8D4D9', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                {adding ? '추가 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 마이너스 확인 모달 */}
      {showMinusModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: '#333',
              marginBottom: '16px'
            }}>
              포인트 수정
            </h3>
            <p style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '8px'
            }}>
              실수로 + 버튼을 누른 경우<br />
              정직하게 수정합니다.
            </p>
            <p style={{
              fontFamily: "'DaHyun', 'Pretendard', sans-serif",
              fontSize: '18px',
              fontWeight: 600,
              color: '#E74C3C',
              marginBottom: '24px'
            }}>
              현재 포인트: {currentPoints}/20<br />
              수정 후 포인트: {currentPoints - 1}/20
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={handleMinusCancel} disabled={subtracting} style={{ flex: 1, padding: '12px 24px', fontSize: '16px', fontWeight: 600, fontFamily: "'DaHyun', 'Pretendard', sans-serif", color: '#666', background: 'white', border: '2px solid #E0E0E0', borderRadius: '8px', cursor: 'pointer' }}>
                취소
              </button>
              <button onClick={handleMinusConfirm} disabled={subtracting} style={{ flex: 1, padding: '12px 24px', fontSize: '16px', fontWeight: 600, fontFamily: "'DaHyun', 'Pretendard', sans-serif", color: 'white', background: subtracting ? '#ccc' : '#E74C3C', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                {subtracting ? '수정 중...' : '수정하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DailyPointsModule;
