import { Link, useLocation, useParams } from 'react-router-dom';
import { useCanvasData } from '../context/CanvasDataContext';
import './LessonPage.css';

interface LessonState {
  title?: string;
  htmlUrl?: string;
  courseId?: string;
  courseName?: string;
}

export default function LessonPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const location = useLocation();
  const { courses } = useCanvasData();
  const state = (location.state as LessonState) ?? {};

  const course = courses.find((c) => c.id === state.courseId);
  const title = state.title ?? 'Lesson';
  const openUrl = state.htmlUrl;

  if (openUrl) {
    window.location.href = openUrl;
    return <p className="lesson-redirect">Opening lesson in Canvas…</p>;
  }

  return (
    <div className="lesson-page">
      <nav className="breadcrumb">
        {state.courseId ? (
          <Link to={`/course/${state.courseId}`}>{state.courseName ?? course?.name ?? 'Course'}</Link>
        ) : (
          <Link to="/courses">My Courses</Link>
        )}
        <span> › </span>
        <span>{title}</span>
      </nav>

      <h1 className="lesson-title">{title}</h1>
      <p>Open this lesson from your course modules in Canvas.</p>
      <Link to={state.courseId ? `/course/${state.courseId}` : '/courses'} className="btn btn-primary">
        Back to course
      </Link>
      {itemId && <p className="lesson-id">Item ID: {itemId}</p>}
    </div>
  );
}
