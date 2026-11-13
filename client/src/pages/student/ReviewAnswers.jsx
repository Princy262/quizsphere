import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import { imageUrl } from '../../utils/imageUrl.js';

const letter = (i) => String.fromCharCode(65 + i); // 0 -> A
const letters = (arr) => (arr.length ? arr.map(letter).join(', ') : 'Not answered');

const ReviewAnswers = () => {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/student/quizzes/${id}/review`)
      .then(({ data }) => setData(data))
      .catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  const back = (
    <Link to={`/student/quizzes/${id}`} className="link-more back-link">
      <ArrowLeft size={16} /> Back to quiz
    </Link>
  );

  if (error) {
    return (
      <div>
        {back}
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }
  if (!data) return <p className="center-text">Loading responses...</p>;

  // Which attempt is being viewed (from ?attempt=2), default: the first
  const wanted = Number(params.get('attempt'));
  const attemptNo = data.attempts.some((a) => a.attemptNumber === wanted)
    ? wanted
    : data.attempts[0].attemptNumber;
  const attemptInfo = data.attempts.find((a) => a.attemptNumber === attemptNo);

  return (
    <div>
      {back}

      <div className="hero">
        <h1>{data.quiz.title}: your responses</h1>
        <p className="muted">
          Attempt {attemptNo}: scored {attemptInfo.score} / {data.totalQuestions}
        </p>
      </div>

      <div className="attempt-tabs">
        {data.attempts.map((a) => (
          <button
            key={a.attemptNumber}
            className={`attempt-tab ${a.attemptNumber === attemptNo ? 'active' : ''}`}
            onClick={() => setParams({ attempt: a.attemptNumber })}
          >
            Attempt {a.attemptNumber} ({a.score}/{data.totalQuestions})
          </button>
        ))}
      </div>

      {data.questions.map((q) => {
        const mine = q.yourAnswers.find((y) => y.attemptNumber === attemptNo);
        const ok = mine.isCorrect;

        return (
          <div key={q.questionIndex} className={`review-q ${ok ? 'correct' : 'wrong'}`}>
            <h3>
              {ok ? (
                <CheckCircle2 size={20} color="#059669" />
              ) : (
                <XCircle size={20} color="#dc2626" />
              )}
              Question {q.questionIndex + 1}
              {q.multiple && <span className="chip chip-msq">MSQ</span>}
            </h3>

            <p className="q-text" style={{ fontSize: '1rem' }}>{q.text}</p>
            {q.image && (
              <img className="question-image" src={imageUrl(q.image)} alt="Question" />
            )}

            {q.options.map((option, oi) => {
              const isCorrectOpt = q.correctAnswers.includes(oi);
              const pickedWrong = mine.selected.includes(oi) && !isCorrectOpt;
              return (
                <div
                  key={oi}
                  className={`review-opt ${isCorrectOpt ? 'is-correct' : ''} ${
                    pickedWrong ? 'is-wrong-pick' : ''
                  }`}
                >
                  <b>{letter(oi)}.</b> {option}
                  {isCorrectOpt && <span style={{ marginLeft: 'auto' }}>✔</span>}
                  {pickedWrong && <span style={{ marginLeft: 'auto' }}>✘</span>}
                </div>
              );
            })}

            <div className="answer-lines">
              {ok ? (
                <div className="good">Your answer: {letters(mine.selected)} (correct)</div>
              ) : (
                <>
                  <div className="good">Correct answer: {letters(q.correctAnswers)}</div>
                  <div className="bad">Your answer: {letters(mine.selected)}</div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReviewAnswers;