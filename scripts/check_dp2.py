import sys; sys.path.insert(0, '/home/huawei-cloud/latam-cloud-erp-')
from app import app, db; from models.models import Customer, Project
with app.app_context():
  # Find project 1787075729268's customer
  p = Project.query.get('1787075729268')
  print(f'Project customerId: {p.customer_id if p else "project not found"}')
  cid = p.customer_id if p else '1787075244194'
  c = Customer.query.get(cid)
  if c:
    print(f'Found customer: id={c.id} name={c.name} region={c.region}')
    for col in c.__table__.columns:
      name = col.name
      val = getattr(c, name)
      if val is not None and str(val).strip():
        sval = str(val)
        print(f'  {name} = {sval[:120]}')
  else:
    print(f'Customer {cid} NOT FOUND - listing all customers:')
    for c2 in Customer.query.all():
      print(f'  {c2.id}: {c2.name}')
