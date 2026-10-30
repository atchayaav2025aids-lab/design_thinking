import unittest

from backend.database import Student
from routers.attendance import calculate_student_attendance


class AttendanceDefaultsTests(unittest.TestCase):
    def test_student_defaults_are_zero_not_hardcoded(self):
        student = Student()
        self.assertEqual(student.present_hours, 0)
        self.assertEqual(student.absent_hours, 0)
        self.assertEqual(student.missed_labs, 0)
        self.assertEqual(student.leave_count, 0)
        self.assertEqual(student.total_working_hours, 0)

    def test_no_records_yields_zero_attendance_summary(self):
        student = Student(id=1, total_working_hours=0, present_hours=0, absent_hours=0, missed_labs=0, leave_count=0)
        summary = calculate_student_attendance(student, db=None)
        self.assertEqual(summary["percentage"], 0.0)
        self.assertEqual(summary["present_hours"], 0)
        self.assertEqual(summary["absent_hours"], 0)
        self.assertEqual(summary["missed_labs"], 0)


if __name__ == "__main__":
    unittest.main()
