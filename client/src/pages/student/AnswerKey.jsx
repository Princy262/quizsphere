import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, KeyRound } from 'lucide-react';
import api, { getErrorMessage } from '../../api/axios.js';
import { imageUrl } from '../../utils/imageUrl.js';

const letter = (i) => String.fromCharCode(65 + i); // 0 -> A

const AnswerKey = () => {
  const { id } = useParams();
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
  if (!data) return <p className="center-text">Loading answer key...</p>;

  return (
    <div>
      {back}

      <div className="hero">
        <h1>{data.quiz.title}: answer key</h1>
        <p className="muted">
          <KeyRound size={15} style={{ verticalAlign: '-2px' }} /> Correct answers for all{' '}
          {data.totalQuestions} questions
        </p>
      </div>

      {data.questions.map((q) => (
        <div key={q.questionIndex} className="review-q correct">
          <h3>
            Question {q.questionIndex + 1}
            {q.multiple && <span className="chip chip-msq">MSQ</span>}
          </h3>

          <p className="q-text" style={{ fontSize: '1rem' }}>
            {q.text}
          </p>
          {q.image && <img className="question-image" src={imageUrl(q.image)} alt="Question" />}

          {q.options.map((option, oi) => {
            const isCorrect = q.correctAnswers.includes(oi);
            return (
              <div key={oi} className={`review-opt ${isCorrect ? 'is-correct' : ''}`}>
                <b>{letter(oi)}.</b> {option}
                {isCorrect && <span style={{ marginLeft: 'auto' }}>✔</span>}
              </div>
            );
          })}

          <div className="answer-lines">
            <div className="good">Correct answer: {q.correctAnswers.map(letter).join(', ')}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AnswerKey;