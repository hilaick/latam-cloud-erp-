import sys
sys.path.insert(0, '/home/huawei-cloud/latam-cloud-erp-')
from app import app, db
from models import Project, Customer
with app.app_context():
    p = Project.query.get('1787075729268')
    print('Project:', p.id if p else 'none', 'cust=', p.customer_id if p else '?')
    c = Customer.query.get(p.customer_id)
    print('Customer:', c.id if c else 'none', c.name if c else '')
    if c:
        for col in c.__table__.columns:
            v = getattr(c, col.name)
            if v is not None and str(v).strip():
                sval = str(v)
                print(col.name, '=', sval[:150])
    else:
        print('All customers:')
        for c2 in Customer.query.all():
            print(f'  {c2.id}: {c2.name}')
