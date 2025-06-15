import logo from './logo.svg';
import './App.css';
import InvoiceForm from './components/InvoiceForm';
import InvoiceList from './components/InvoiceList';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';


function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
                <div className="max-w-4xl mx-auto px-4">
                  <header className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-bold text-indigo-800 mb-2">
                      E-Invoice Prototype
                    </h1>
                    <p className="text-indigo-600 max-w-lg mx-auto">
                      Generate, submit, and manage electronic invoices with real-time calculations
                    </p>
                  </header>
                  

                   {/* Navigation Bar */}
                    <nav className="mt-6 mb-8">
                      <ul className="flex justify-center space-x-6">
                        <li>
                          <Link 
                            to="/" 
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Create Invoice
                          </Link>
                        </li>
                        <li>
                          <Link 
                            to="/invoices" 
                            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
                          >
                            View Invoices
                          </Link>
                        </li>
                      </ul>
                    </nav>
                  
                  <main className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    {/* <InvoiceForm /> */}
                    <Routes>
                      <Route path="/" element={<InvoiceForm />} />
                      <Route path="/invoices" element={<InvoiceList />} />
                    </Routes>
                  </main>
                  
                  
                  <footer className="mt-10 text-center text-gray-600 text-sm">
                    <p>© {new Date().getFullYear()} E-Invoice Prototype | React Hook Form & Tailwind CSS</p>
                  </footer>
                </div>
        </div>
    </Router>
  
        
  )
}

export default App;
