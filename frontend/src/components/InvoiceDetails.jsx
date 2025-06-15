// src/components/InvoiceDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';

const InvoiceDetail = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5005/invoice/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.status === 'success') {
          setInvoice(data.invoice);
        } else {
          setError(data.message || 'Failed to fetch invoice');
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-xl text-center">
        <div className="text-red-600 font-medium mb-2">Error loading invoice</div>
        <div className="text-red-500 mb-4">{error}</div>
        <Link 
          to="/invoices"
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-10">
        <div className="text-gray-500 mb-4">Invoice not found</div>
        <Link 
          to="/invoices"
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link 
          to="/invoices" 
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <FiArrowLeft className="mr-2" /> Back to Invoices
        </Link>
      </div>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-indigo-800">Invoice Details</h1>
          <div className="text-gray-600">ID: {invoice.invoice_id}</div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          invoice.invoice_status === 'completed' ? 'bg-green-100 text-green-800' :
          invoice.invoice_status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
          invoice.invoice_status === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {invoice.invoice_status}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Buyer Information</h2>
          <div className="space-y-2">
            <div>
              <div className="text-sm text-gray-500">Name</div>
              <div className="font-medium">{invoice.buyer_info.name}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Tax ID (CR)</div>
              <div className="font-medium">{invoice.buyer_id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Address</div>
              <div className="font-medium">{invoice.buyer_info.address}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Seller Information</h2>
          <div className="space-y-2">
            <div>
              <div className="text-sm text-gray-500">Tax ID (CR)</div>
              <div className="font-medium">{invoice.seller_cr}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Invoice Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Created</span>
              <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>${invoice.total_amount_without_tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span>${invoice.total_tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200 font-bold">
              <span>Total</span>
              <span className="text-lg">${invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Verification</h2>
        <div className="flex flex-col items-center">
          <QRCodeSVG 
            value={invoice.invoice_id} 
            size={150} 
            level="H"
            className="mb-4"
          />
          <div className="text-sm text-gray-500">Scan to verify invoice</div>
        </div>
      </div>
      
      <div className="flex justify-center">
        <button 
          className="flex items-center bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
          onClick={() => {
            // This would download the invoice XML
            alert(`Downloading invoice ${invoice.invoice_id}`);
          }}
        >
          <FiDownload className="mr-2" /> Download Invoice XML
        </button>
      </div>
    </div>
  );
};

export default InvoiceDetail;