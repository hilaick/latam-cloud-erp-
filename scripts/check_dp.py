import sys; sys.path.insert(0, '/home/huawei-cloud/latam-cloud-erp-')
from app import app, db
from models.models import Customer
with app.app_context():
  c = Customer.query.get('1787075244194')
  if c:
    for col in c.__table__.columns:
      name = col.name
      val = getattr(c, name)
      if val is not None and str(val).strip():
        sval = str(val)
        print(f'{name}={sval[:120]}')
  else:
    print('NOT FOUND')
