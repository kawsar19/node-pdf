const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

// Mock student data
const students = [
  {
    id: 1,
    name: "John Doe",
    course: "Computer Science",
    validUntil: "31/12/2025",
    imageUrl: "/public/student-image-placeholder.png", // Placeholder image path
  },
  {
    id: 2,
    name: "Jane Smith",
    course: "Business Administration",
    validUntil: "31/12/2024",
    imageUrl: "/public/student-image-placeholder.png",
  },
];

// Middleware to serve static files (images, etc.)
app.use(express.static(path.join(__dirname, "public")));

// Route to get student data by ID
app.get("/students/:id", (req, res) => {
  const studentId = parseInt(req.params.id);
  const student = students.find((student) => student.id === studentId);

  if (student) {
    res.json(student);
  } else {
    res.status(404).json({ message: "Student not found" });
  }
});

// Function to generate Student ID PDF
async function generateStudentID(studentId) {
  const student = students.find((student) => student.id === studentId);

  if (!student) {
    throw new Error("Student not found");
  }

  // Launch a headless browser
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Read the HTML template from the file
  const htmlPath = path.join(__dirname, "html", "student-id.html");
  let htmlContent = fs.readFileSync(htmlPath, "utf8");

  // Replace placeholders in the HTML with dynamic student data
  htmlContent = htmlContent
    .replace("{{STUDENT_NAME}}", student.name)
    .replace("{{STUDENT_ID}}", student.id)
    .replace("{{COURSE}}", student.course)
    .replace("{{VALID_UNTIL}}", student.validUntil)
    .replace("{{IMAGE_URL}}", student.imageUrl);

  // Load HTML content into the page
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  // Generate a PDF from the page content
  const pdfPath = path.join(__dirname, `student-id-card-${student.id}.pdf`);
  await page.pdf({
    path: pdfPath, // File path for the generated PDF
    format: "A4", // Paper size
    printBackground: true, // Include background colors
    margin: { top: "1cm", bottom: "1cm", left: "1cm", right: "1cm" }, // Add some margin
  });

  // Close the browser
  await browser.close();

  console.log(
    `Student ID Card PDF for ${student.name} generated successfully.`
  );
  return pdfPath;
}

// Route to generate and serve the PDF, then delete it
app.get("/generate-pdf/:id", async (req, res) => {
  const studentId = parseInt(req.params.id);

  try {
    const pdfPath = await generateStudentID(studentId);

    // Send the PDF file for download
    res.download(pdfPath, `student-id-card-${studentId}.pdf`, (err) => {
      if (err) {
        console.error("Error downloading the file: ", err);
      }

      // After sending the file, delete it from the server
      fs.unlink(pdfPath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Error deleting the file: ", unlinkErr);
        } else {
          console.log(`Deleted file: ${pdfPath}`);
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
