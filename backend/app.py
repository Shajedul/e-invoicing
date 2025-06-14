import uuid
from datetime import datetime
from flask import Flask, request, jsonify
from sqlalchemy import create_engine, Column, String, Float, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from flask_cors import CORS  # Add this import


app = Flask(__name__)
CORS(app)


# Database setup
DATABASE_URI = 'sqlite:///invoices.db'
engine = create_engine(DATABASE_URI)
Base = declarative_base()
Session = sessionmaker(bind=engine)

# Invoice Model Schema


class Invoice(Base):
    __tablename__ = 'invoices'

    invoice_id = Column(String(36), primary_key=True,
                        default=lambda: str(uuid.uuid4()))
    buyer_info = Column(JSON, nullable=False)
    seller_info = Column(JSON, nullable=False)
    seller_cr = Column(String(50), nullable=False)
    buyer_id = Column(String(50), nullable=False)
    total_amount = Column(Float, nullable=False)
    total_amount_without_tax = Column(Float, nullable=False)
    total_tax = Column(Float, nullable=False)
    invoice_status = Column(String(20), default='valid')
    invoice_type = Column(String(20), default='Tax Invoice')
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<Invoice {self.invoice_id}>'


# Create tables at application startup
with app.app_context():
    Base.metadata.create_all(engine)

# Invoice Manager


class InvoiceManager:
    @staticmethod
    def create_invoice(data):
        """Create and save a new invoice"""
        # Calculate totals
        total_without_tax = 0
        total_tax = 0

        for item in data['items']:
            unit_price = float(item['unitPrice'])
            quantity = int(item['quantity'])
            tax_percentage = float(item['taxPercentage'])

            item_total = unit_price * quantity
            item_tax = item_total * (tax_percentage / 100)

            total_without_tax += item_total
            total_tax += item_tax

        total_amount = total_without_tax + total_tax

        # Create invoice object
        invoice = Invoice(
            buyer_info=data['buyer'],
            seller_info={'crId': data['sellerId']},
            seller_cr=data['sellerId'],
            buyer_id=data['buyer']['crId'],
            invoice_type=data['invoice_type'],
            invoice_status = data['invoice_status'],
            total_amount=total_amount,
            total_amount_without_tax=total_without_tax,
            total_tax=total_tax
        )

        # Save to database
        session = Session()
        session.add(invoice)
        session.commit()

        # Return the created invoice for response
        result = {
            'invoice_id': invoice.invoice_id,
            'total_amount': invoice.total_amount
        }

        session.close()
        return result

# API View

@app.route('/')
def home():
    return jsonify({
        "message": "E-Invoice API",
        "endpoints": {
            "submit_invoice": {
                "url": "/submit_invoice",
                "method": "POST",
                "description": "Submit a new invoice"
            }
        }
    })


@app.route('/invoice_list', methods=['GET'])
def get_invoices():
    session = Session()
    try:
        # Query all invoices from the database
        invoices = session.query(Invoice).all()

        # Convert invoices to a list of dictionaries
        invoices_list = []
        for invoice in invoices:
            invoices_list.append({
                "invoice_id": invoice.invoice_id,
                "invoice_type": invoice.invoice_type,
                "buyer_info": invoice.buyer_info,
                "seller_info": invoice.seller_info,
                "seller_cr": invoice.seller_cr,
                "buyer_id": invoice.buyer_id,
                "total_amount": invoice.total_amount,
                "total_amount_without_tax": invoice.total_amount_without_tax,
                "total_tax": invoice.total_tax,
                "invoice_status": invoice.invoice_status,
                "created_at": invoice.created_at.isoformat(),
                "updated_at": invoice.updated_at.isoformat() if invoice.updated_at else None
            })

        return jsonify({
            "status": "success",
            "count": len(invoices_list),
            "invoices": invoices_list
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to fetch invoices: {str(e)}"
        }), 500

    finally:
        session.close()

@app.route('/submit_invoice', methods=['POST'])
def submit_invoice():
    # Get and validate request data
    data = request.get_json()
    print(data)
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    # Validate required fields
    required_fields = ['invoiceNumber',
                       'invoiceType', 'sellerId', 'buyer', 'items']
    for field in required_fields:
        if field not in data:
            return jsonify({
                "status": "error",
                "message": f"Missing required field: {field}"
            }), 400

    # Validate buyer has crId
    if 'crId' not in data['buyer']:
        return jsonify({
            "status": "error",
            "message": "Buyer information is missing 'crId' field"
        }), 400

    # Validate items array
    if not isinstance(data['items'], list) or len(data['items']) == 0:
        return jsonify({
            "status": "error",
            "message": "Items must be a non-empty array"
        }), 400

    # Validate item fields
    for i, item in enumerate(data['items']):
        required_item_fields = ['description',
                                'unitPrice', 'quantity', 'taxPercentage']
        for field in required_item_fields:
            if field not in item:
                return jsonify({
                    "status": "error",
                    "message": f"Item {i+1} is missing required field: {field}"
                }), 400

    # Create and save invoice
    try:
        result = InvoiceManager.create_invoice(data)
        return jsonify({
            "status": "success",
            "message": "Invoice processed successfully",
            "invoice_id": result['invoice_id'],
            "total_amount": result['total_amount']
        })
    except KeyError as e:
        return jsonify({
            "status": "error",
            "message": f"Missing field in data: {str(e)}"
        }), 400
    except (TypeError, ValueError) as e:
        return jsonify({
            "status": "error",
            "message": f"Invalid data format: {str(e)}"
        }), 400
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Server error: {str(e)}"
        }), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0',port =5005)
    
