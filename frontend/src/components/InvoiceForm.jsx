// src/components/InvoiceForm.js
import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { FiPlus, FiTrash2, FiSend, FiCheck, FiX, FiCopy, FiDownload } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import XMLViewer from 'react-xml-viewer';

const InvoiceForm = () => {
  const [apiResponse, setApiResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedXml, setGeneratedXml] = useState(null);
  const [isValidatingWithZatka, setIsValidatingWithZatka] = useState(false);

  // API Configuration
  const SUBMIT_INVOICE_URL = `http://localhost:5005/submit_invoice`;

  // Generate random invoice number
  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${year}${month}-${random}`;
  };

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    defaultValues: {
      invoiceNumber: generateInvoiceNumber(),
      invoiceType: 'standard',
      sellerId: '',
      buyer: {
        name: '',
        address: '',
        crId: ''
      },
      items: [{
        id: 1,
        description: '',
        unitPrice: 0,
        quantity: 1,
        taxPercentage: 15,
        taxAmount: 0,
        totalWithoutTax: 0,
        totalWithTax: 0
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Watch all form values to recalculate totals
  const formValues = watch();

  // Calculate totals for each line item
  const calculateItemTotals = (index) => {
    const item = formValues.items[index];
    if (!item) return { taxAmount: 0, totalWithoutTax: 0, totalWithTax: 0 };
    
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const quantity = parseInt(item.quantity, 10) || 0;
    const taxPercentage = parseFloat(item.taxPercentage) || 0;
    
    const totalWithoutTax = unitPrice * quantity;
    const taxAmount = totalWithoutTax * (taxPercentage / 100);
    const totalWithTax = totalWithoutTax + taxAmount;
    
    return {
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalWithoutTax: parseFloat(totalWithoutTax.toFixed(2)),
      totalWithTax: parseFloat(totalWithTax.toFixed(2))
    };
  };

  // Calculate invoice totals
  const invoiceTotals = formValues.items.reduce((acc, item, index) => {
    const { taxAmount, totalWithoutTax, totalWithTax } = calculateItemTotals(index);
    return {
      totalTax: acc.totalTax + taxAmount,
      subtotal: acc.subtotal + totalWithoutTax,
      grandTotal: acc.grandTotal + totalWithTax
    };
  }, { totalTax: 0, subtotal: 0, grandTotal: 0 });

  // Generate XML invoice function
  const generateXmlInvoice = (data) => {
    const invoiceDate = new Date().toISOString().split('T')[0];
    
    let itemsXml = '';
    data.items.forEach(item => {
      itemsXml += `
      <Item>
          <Description>${item.description}</Description>
          <UnitPrice>${item.unitPrice}</UnitPrice>
          <Quantity>${item.quantity}</Quantity>
          <TaxPercentage>${item.taxPercentage}</TaxPercentage>
          <TaxAmount>${item.taxAmount}</TaxAmount>
          <TotalWithoutTax>${item.totalWithoutTax}</TotalWithoutTax>
          <TotalWithTax>${item.totalWithTax}</TotalWithTax>
      </Item>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
        <Invoice>
            <InvoiceNumber>${data.invoiceNumber}</InvoiceNumber>
            <InvoiceDate>${invoiceDate}</InvoiceDate>
            <InvoiceType>${data.invoiceType}</InvoiceType>
            <Seller>
            <TaxId>${data.sellerId}</TaxId>
            </Seller>
            <Buyer>
            <Name>${data.buyer.name}</Name>
            <Address>${data.buyer.address}</Address>
            <TaxId>${data.buyer.crId}</TaxId>
            </Buyer>
            <Items>
            ${itemsXml}
            </Items>
            <Subtotal>${invoiceTotals.subtotal.toFixed(2)}</Subtotal>
            <TotalTax>${invoiceTotals.totalTax.toFixed(2)}</TotalTax>
            <GrandTotal>${invoiceTotals.grandTotal.toFixed(2)}</GrandTotal>
        </Invoice>`;
  };

  async function submitInvoice(invoiceData) {
    try {
      const response = await fetch(SUBMIT_INVOICE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit invoice');
      }

      console.log('Invoice submitted successfully:', result);
      return result;
      
    } catch (error) {
      console.error('Error submitting invoice:', error);
      throw error;
    }
  }

  // Mock API submission
  const mockSubmitInvoice = async (invoiceData) => {
    setIsValidatingWithZatka(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Random success/failure for demonstration
    const isSuccess = Math.random() > 0.3;
    console.log(isSuccess)
    
    setIsValidatingWithZatka(false);
    
    if (isSuccess) {
      return {
        status: 'success',
        message: 'Invoice processed successfully',
        invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString()
      };
    } else {
      // Random error scenarios
      const errors = [
        { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid tax ID format', 
          details: { field: 'buyer.crId', error: 'Invalid tax ID format' } 
        },
        { 
          code: 'TAX_MISMATCH', 
          message: 'Tax calculation mismatch', 
          details: { field: 'items[0].taxAmount', error: 'Calculated tax does not match provided value' } 
        },
        { 
          code: 'BUYER_INFO_MISSING', 
          message: 'Incomplete buyer information', 
          details: { field: 'buyer.name', error: 'Buyer name is required' } 
        }
      ];
      
      return {
        status: 'error',
        ...errors[Math.floor(Math.random() * errors.length)]
      };
    }
  };

  // Submit handler
  const onSubmit = async (data) => {
    console.log(data)
    setIsSubmitting(true);
    setApiResponse(null);
    
    try {
      // Add calculated values to items
      const processedData = {
        ...data,
        items: data.items.map((item, index) => ({
          ...item,
          ...calculateItemTotals(index)
        }))
      };
      processedData["invoice_type"] = data["invoiceType"]

      
      // Generate XML
      const xmlInvoice = generateXmlInvoice(processedData);
      setGeneratedXml(xmlInvoice);
      
      // Simulate API call
      const response = await mockSubmitInvoice(processedData);
      setApiResponse(response);
      console.log("HERE")
      console.log(response)
      // For demo: reset form after successful submission
      if (response.status === 'success') {
        
        processedData["invoice_status"] = "valid"
        console.log("HERE 2")
        setTimeout(() => {
          reset({
            ...data,
            invoiceNumber: generateInvoiceNumber(),
            items: [{
              id: 1,
              description: '',
              unitPrice: 0,
              quantity: 1,
              taxPercentage: 13,
              taxAmount: 0,
              totalWithoutTax: 0,
              totalWithTax: 0
            }]
          });
        }, 2000);
      }else{
        processedData["invoice_status"] = "invalid"
      }
      console.log(processedData)

      const submitSuccessfulInvoicetresponse = await submitInvoice(processedData);
      
    } catch (error) {
      setApiResponse({
        status: 'error',
        message: 'Submission failed',
        details: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Invoice Header */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-indigo-700 mb-4 pb-2 border-b border-indigo-100">
            Invoice Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                {...register('invoiceNumber')}
                disabled
                className="w-full px-4 py-2 bg-gray-100 rounded-lg text-gray-600"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Type
              </label>
              <select
                {...register('invoiceType', { required: 'Invoice type is required' })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.invoiceType ? 'border-red-500' : 'border-gray-300'
                } focus:ring-indigo-500 focus:border-indigo-500`}
              >
                <option value="standard">Tax Invoice</option>
                <option value="proforma">General Ivoice</option>
                
              </select>
              {errors.invoiceType && (
                <p className="mt-1 text-sm text-red-600">{errors.invoiceType.message}</p>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seller Tax ID (CR)
            </label>
            <input
              type="text"
              {...register('sellerId', { 
                required: 'Seller tax ID is required',
                pattern: {
                  value: /^\d{1}-\d{3}-\d{6}$/,
                  message: 'Format: 1-234-567890'
                }
              })}
              placeholder="1-234-567890"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.sellerId ? 'border-red-500' : 'border-gray-300'
              } focus:ring-indigo-500 focus:border-indigo-500`}
            />
            {errors.sellerId && (
              <p className="mt-1 text-sm text-red-600">{errors.sellerId.message}</p>
            )}
          </div>
        </div>
        
        {/* Buyer Information */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-indigo-700 mb-4 pb-2 border-b border-indigo-100">
            Buyer Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Name
              </label>
              <input
                type="text"
                {...register('buyer.name', { required: 'Buyer name is required' })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.buyer?.name ? 'border-red-500' : 'border-gray-300'
                } focus:ring-indigo-500 focus:border-indigo-500`}
              />
              {errors.buyer?.name && (
                <p className="mt-1 text-sm text-red-600">{errors.buyer.name.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Tax ID (CR)
              </label>
              <input
                type="text"
                {...register('buyer.crId', { 
                  required: 'Buyer tax ID is required',
                  pattern: {
                    value: /^\d{1}-\d{3}-\d{6}$/,
                    message: 'Format: 1-234-567890'
                  }
                })}
                placeholder="1-234-567890"
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.buyer?.crId ? 'border-red-500' : 'border-gray-300'
                } focus:ring-indigo-500 focus:border-indigo-500`}
              />
              {errors.buyer?.crId && (
                <p className="mt-1 text-sm text-red-600">{errors.buyer.crId.message}</p>
              )}
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buyer Address
            </label>
            <input
              type="text"
              {...register('buyer.address', { required: 'Buyer address is required' })}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.buyer?.address ? 'border-red-500' : 'border-gray-300'
              } focus:ring-indigo-500 focus:border-indigo-500`}
            />
            {errors.buyer?.address && (
              <p className="mt-1 text-sm text-red-600">{errors.buyer.address.message}</p>
            )}
          </div>
        </div>
        
        {/* Line Items */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-2 border-b border-indigo-100">
            <h2 className="text-xl font-bold text-indigo-700">
              Products & Services
            </h2>
            <button
              type="button"
              onClick={() => append({
                id: fields.length + 1,
                description: '',
                unitPrice: 0,
                quantity: 1,
                taxPercentage: 13,
                taxAmount: 0,
                totalWithoutTax: 0,
                totalWithTax: 0
              })}
              className="mt-2 sm:mt-0 flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiPlus className="mr-2" />
              Add Item
            </button>
          </div>
          
          <div className="space-y-6">
            {fields.map((item, index) => {
              const itemTotals = calculateItemTotals(index);
              
              return (
                <div key={item.id} className="p-5 bg-gray-50 rounded-xl border border-gray-200 relative">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium text-gray-800">Item #{index + 1}</h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        {...register(`items.${index}.description`, { 
                          required: 'Description is required' 
                        })}
                        className={`w-full px-4 py-2 rounded-lg border ${
                          errors.items?.[index]?.description ? 'border-red-500' : 'border-gray-300'
                        } focus:ring-indigo-500 focus:border-indigo-500`}
                      />
                      {errors.items?.[index]?.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index].description.message}</p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Price ($)
                        </label>
                        <Controller
                          name={`items.${index}.unitPrice`}
                          control={control}
                          rules={{
                            "required": 'Unit price is required',
                            "min": { 
                                value : 0.01,
                                message: 'Unit price must be at least 0.01' 
                            }}}
                          render={({ field }) => (
                            <input
                              type="number"
                              {...field}
                              min="0"
                              step="0.01"
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                field.onChange(value);
                              }}
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          )}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <Controller
                            name={`items.${index}.quantity`}
                            control={control}
                            rules={{
                                required: "Quantity is required",
                                min: {
                                value: 1,
                                message: "Quantity must be at least 1"
                                },
                                max: {
                                value: 10000,
                                message: "Quantity cannot exceed 10,000"
                                },
                                validate: {
                                isInteger: value => Number.isInteger(value) || "Must be a whole number",
                                notZero: value => value > 0 || "Must be at least 1"
                                }
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <div>
                                <input
                                    type="number"
                                    {...field}
                                    min="1"
                                    max="10000"
                                    step="1"
                                    onChange={(e) => {
                                    const value = parseInt(e.target.value, 10);
                                    field.onChange(isNaN(value) ? "" : value);
                                    }}
                                    className={`w-full px-4 py-2 rounded-lg border ${
                                    error ? 'border-red-500' : 'border-gray-300'
                                    } focus:ring-indigo-500 focus:border-indigo-500`}
                                />
                                {error && (
                                    <p className="mt-1 text-sm text-red-600">{error.message}</p>
                                )}
                                </div>
                            )}
                            />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tax (%)
                        </label>
                        <Controller
                                name={`items.${index}.taxPercentage`}
                                control={control}
                                rules={{
                                    required: "Tax percentage is required",
                                    min: {
                                    value: 0,
                                    message: "Tax percentage must be at least 0%"
                                    },
                                    max: {
                                    value: 100,
                                    message: "Tax percentage cannot exceed 100%"
                                    },
                                    validate: value => !isNaN(value) || "Please enter a valid number"
                                }}
                                render={({ field, fieldState: { error } }) => (
                                    <div>
                                    <input
                                        type="number"
                                        {...field}
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        field.onChange(isNaN(value) ? "" : value);
                                        }}
                                        className={`w-full px-4 py-2 rounded-lg border ${
                                        error ? 'border-red-500' : 'border-gray-300'
                                        } focus:ring-indigo-500 focus:border-indigo-500`}
                                    />
                                    {error && (
                                        <p className="mt-1 text-sm text-red-600">{error.message}</p>
                                    )}
                                    </div>
                                )}
                                />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">Tax Amount</span>
                      <span className="font-medium text-gray-800">${itemTotals.taxAmount.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">Total w/o Tax</span>
                      <span className="font-medium text-gray-800">${itemTotals.totalWithoutTax.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-600">Total with Tax</span>
                      <span className="font-medium text-indigo-700">${itemTotals.totalWithTax.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Invoice Summary */}
        <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 mb-8">
          <h2 className="text-xl font-bold text-indigo-700 mb-4">
            Invoice Summary
          </h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-700">Subtotal:</span>
              <span className="font-medium text-gray-800">${invoiceTotals.subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-700">Total Tax:</span>
              <span className="font-medium text-gray-800">${invoiceTotals.totalTax.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between pt-3 border-t border-indigo-100">
              <span className="text-lg font-bold text-gray-800">Grand Total:</span>
              <span className="text-xl font-bold text-indigo-700">${invoiceTotals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex items-center px-6 py-3 rounded-lg text-white font-medium transition-colors ${
              isSubmitting 
                ? 'bg-indigo-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <FiSend className="mr-2" />
                Submit Invoice
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* API Response */}
      {apiResponse && (
        <div className={`mt-8 p-5 rounded-xl ${
          apiResponse.status === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            <div className={`flex-shrink-0 mt-1 ${
              apiResponse.status === 'success' ? 'text-green-500' : 'text-red-500'
            }`}>
              {apiResponse.status === 'success' ? (
                <FiCheck size={24} />
              ) : (
                <FiX size={24} />
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${
                apiResponse.status === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {apiResponse.status === 'success' ? 'Success!' : 'Error'}
              </h3>
              <div className={`mt-2 text-sm ${
                apiResponse.status === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                <p className="mb-2">{apiResponse.message}</p>
                
                {apiResponse.details && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                    <p><span className="font-medium">Field:</span> {apiResponse.details.field}</p>
                    <p><span className="font-medium">Error:</span> {apiResponse.details.error}</p>
                  </div>
                )}
                
                {apiResponse.invoiceId && (
                  <p className="mt-2"><span className="font-medium">Invoice ID:</span> {apiResponse.invoiceId}</p>
                )}
              </div>
            </div>
          </div>
          {generatedXml && (
                <div className="mt-8 p-5 bg-blue-50 rounded-xl border border-blue-200">
                    <h3 className="text-lg font-bold text-blue-800 mb-4">Generated XML Invoice</h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-800 p-4 rounded-lg overflow-auto max-h-96">
                        <pre className="text-green-400 text-sm">{generatedXml}</pre>
                        {console.debug(generatedXml)}
                    </div>
                    
                    <div className="flex flex-col items-center justify-center">
                        <div className="bg-white p-4 rounded-lg shadow-md">
                        <h4 className="text-md font-semibold text-gray-700 mb-3 text-center">
                            Invoice Verification QR
                        </h4>
                        <QRCodeSVG 
                            value={apiResponse?.invoiceId || "INV-DEMO-12345"} 
                            size={150} 
                            level="H"
                            className="mx-auto"
                        />
                        <p className="text-xs text-gray-500 mt-3 text-center">
                            {apiResponse?.invoiceId || "DEMO-ID-12345"}
                        </p>
                        </div>
                        
                        <div className="mt-4 flex space-x-2">
                        <button
                            onClick={() => navigator.clipboard.writeText(generatedXml)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            <FiCopy className="mr-2" /> Copy XML
                        </button>
                        <a
                            href={`data:text/xml;charset=utf-8,${encodeURIComponent(generatedXml)}`}
                            download="invoice.xml"
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            <FiDownload className="mr-2" /> Download
                        </a>
                        </div>
                    </div>
                    </div>
                </div>
                )}
        </div>
      )}

      {/* ZATKA Validation Loader */}
      {isValidatingWithZatka && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              <svg className="animate-spin h-12 w-12 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Validating with ZATKA</h3>
            <p className="text-gray-600">Please wait while we validate your invoice with the ZATKA system...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;