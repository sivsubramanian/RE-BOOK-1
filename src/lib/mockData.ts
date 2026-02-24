export interface Book {
  id: string;
  title: string;
  author: string;
  image: string;
  semester: number;
  department: string;
  condition: "Like New" | "Good" | "Fair";
  price: number;
  sellerName: string;
  sellerAvatar: string;
  sellerRating: number;
  listedAt: string;
}

export interface Transaction {
  id: string;
  bookTitle: string;
  buyerName: string;
  status: "requested" | "accepted" | "completed";
  date: string;
}

const departments = ["Computer Science", "Electrical Eng.", "Mechanical Eng.", "Business Admin", "Mathematics", "Physics", "Chemistry", "Literature"];
const conditions: Book["condition"][] = ["Like New", "Good", "Fair"];

const bookTitles = [
  "Data Structures & Algorithms",
  "Introduction to Machine Learning",
  "Discrete Mathematics",
  "Operating Systems Concepts",
  "Database Management Systems",
  "Computer Networks",
  "Digital Signal Processing",
  "Linear Algebra",
  "Organic Chemistry",
  "Microeconomics",
  "Engineering Mechanics",
  "Artificial Intelligence: A Modern Approach",
  "Calculus: Early Transcendentals",
  "Physics for Scientists & Engineers",
  "Software Engineering",
  "Theory of Computation",
];

const authors = [
  "Thomas H. Cormen",
  "Andrew Ng",
  "Kenneth Rosen",
  "Abraham Silberschatz",
  "Raghu Ramakrishnan",
  "Andrew Tanenbaum",
  "Alan Oppenheim",
  "Gilbert Strang",
  "Paula Bruice",
  "N. Gregory Mankiw",
  "J.L. Meriam",
  "Stuart Russell",
  "James Stewart",
  "Serway & Jewett",
  "Ian Sommerville",
  "Michael Sipser",
];

const names = ["Arjun S.", "Priya M.", "Rahul K.", "Sneha D.", "Vikram T.", "Ananya R.", "Karthik N.", "Divya P."];

export const mockBooks: Book[] = bookTitles.map((title, i) => ({
  id: `book-${i + 1}`,
  title,
  author: authors[i],
  image: `https://picsum.photos/seed/book${i + 1}/400/560`,
  semester: (i % 8) + 1,
  department: departments[i % departments.length],
  condition: conditions[i % 3],
  price: Math.floor(Math.random() * 400) + 100,
  sellerName: names[i % names.length],
  sellerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${names[i % names.length]}`,
  sellerRating: +(3.5 + Math.random() * 1.5).toFixed(1),
  listedAt: `${Math.floor(Math.random() * 7) + 1}d ago`,
}));

export const mockTransactions: Transaction[] = [
  { id: "t1", bookTitle: "Data Structures & Algorithms", buyerName: "Sneha D.", status: "requested", date: "2 hours ago" },
  { id: "t2", bookTitle: "Linear Algebra", buyerName: "Vikram T.", status: "accepted", date: "1 day ago" },
  { id: "t3", bookTitle: "Organic Chemistry", buyerName: "Ananya R.", status: "completed", date: "3 days ago" },
  { id: "t4", bookTitle: "Computer Networks", buyerName: "Rahul K.", status: "requested", date: "5 hours ago" },
  { id: "t5", bookTitle: "Microeconomics", buyerName: "Priya M.", status: "completed", date: "1 week ago" },
];

export const sellerStats = {
  totalListed: 12,
  requestsReceived: 28,
  accepted: 19,
  completed: 15,
};
