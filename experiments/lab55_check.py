import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import featlab as L
from pipetwin import features as F
t=time.time()
ds=L.build(tag="ref", force=True); L.log("build", time.time()-t, ds.shape)
ref=L.load_ref()
import numpy as np
c=[x for x in ref.columns if x not in ("start","end","kind","split")]
print("maxdiff", np.nanmax(np.abs(ds[c].astype(float).values-ref[c].astype(float).values)))
f1=F.case_features(ds,"case1"); f2=F.case_features(ds,"case2")
t=time.time(); L.log("c1", L.fmt(L.eval_case1(ds,f1)), time.time()-t)
t=time.time(); L.log("c2", L.eval_case2(ds,f2), time.time()-t)
