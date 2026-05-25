import { Link } from 'react-router-dom';
import DataBanner from '../components/DataBanner';
import { useCanvasData } from '../context/CanvasDataContext';
import { formatCourseWithTeacher } from '../services/canvasMappers';
import type { Course } from '../types';
import './CoursesPage.css';

function CourseCardArt({ subject }: { subject: Course['subject'] }) {
  if (subject === 'ela') {
    return (
      <div className="course-card-art ela">
        <span className="course-card-subject">ELA</span>
        <span className="course-card-emoji">📚</span>
      </div>
    );
  }
  if (subject === 'math') {
    return (
      <div className="course-card-art math">
        <span className="course-card-subject">MATH</span>
        <span className="course-card-emoji">🔢</span>
      </div>
    );
  }
  return (
    <div className="course-card-art default">
      <span className="course-card-logo">K12</span>
    </div>
  );
}

export default function CoursesPage() {
  const { courses } = useCanvasData();

  return (
    <div className="courses-page">
      <DataBanner />
      <h1 className="page-title">My Courses ({courses.length})</h1>
      <div className="course-grid">
        {courses.map((course) => (
          <Link key={course.id} to={`/course/${course.id}`} className="course-card card">
            <CourseCardArt subject={course.subject} />
            <div className="course-card-body">
              <h3>{formatCourseWithTeacher(course)}</h3>
            </div>
            <div className="course-card-grades">
              <div>
                <span className="label">Current Score</span>
                <span className="value">
                  {course.currentScore != null ? `${course.currentScore}%` : '--'}
                </span>
              </div>
              <div className="divider" />
              <div>
                <span className="label">Grade</span>
                <span className="value">{course.grade ?? '--'}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="coach-tip">
        💡 <strong>Tip for Learning Coaches:</strong> Use the current score to help your learner stay on pace each week.
      </p>
    </div>
  );
}
