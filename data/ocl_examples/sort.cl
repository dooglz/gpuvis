__kernel void bitonic_sort_step(__global  unsigned int *dev_values, int j, int k)
{
  unsigned int i, ixj; /* Sorting partners: i and ixj */
  i = get_global_id(0);
  ixj = i^j;

  /* The threads with the lowest ids sort the array. */
  if ((ixj)>i) {
    if ((i&k) == 0) {
      /* Sort ascending */
      if (dev_values[i]>dev_values[ixj]) {
        /* exchange(i,ixj); */
        unsigned int temp = dev_values[i];
        dev_values[i] = dev_values[ixj];
        dev_values[ixj] = temp;
      }
    }
    if ((i&k) != 0) {
      /* Sort descending */
      if (dev_values[i]<dev_values[ixj]) {
        /* exchange(i,ixj); */
        unsigned int temp = dev_values[i];
        dev_values[i] = dev_values[ixj];
        dev_values[ixj] = temp;
      }
    }
  }
}



//intel vectorised bitonic sort
__kernel void  bitonicSort2(__global int4 * theArray,
  const uint stage,
  const uint passOfStage,
  const uint width)
{
  size_t i = get_global_id(0);
  int4 srcLeft, srcRight, mask;
  int4 imask10 = (int4)(0, 0, -1, -1);
  int4 imask11 = (int4)(0, -1, 0, -1);
  const uint dir = 0;
  if (stage > 0)
  {
    if (passOfStage > 0)    // upper level pass, exchange between two fours
    {
      size_t r = 1 << (passOfStage - 1);
      size_t lmask = r - 1;
      size_t left = ((i >> (passOfStage - 1)) << passOfStage) + (i & lmask);
      size_t right = left + r;

      srcLeft = theArray[left];
      srcRight = theArray[right];
      mask = srcLeft < srcRight;

      int4 imin = (srcLeft & mask) | (srcRight & ~mask);
      int4 imax = (srcLeft & ~mask) | (srcRight & mask);

      if (((i >> (stage - 1)) & 1) ^ dir)
      {
        theArray[left] = imin;
        theArray[right] = imax;
      }
      else
      {
        theArray[right] = imin;
        theArray[left] = imax;
      }
    }
    else    // last pass, sort inside one four
    {
      srcLeft = theArray[i];
      srcRight = srcLeft.zwxy;
      mask = (srcLeft < srcRight) ^ imask10;

      if (((i >> stage) & 1) ^ dir)
      {
        srcLeft = (srcLeft & mask) | (srcRight & ~mask);
        srcRight = srcLeft.yxwz;
        mask = (srcLeft < srcRight) ^ imask11;
        theArray[i] = (srcLeft & mask) | (srcRight & ~mask);
      }
      else
      {
        srcLeft = (srcLeft & ~mask) | (srcRight & mask);
        srcRight = srcLeft.yxwz;
        mask = (srcLeft < srcRight) ^ imask11;
        theArray[i] = (srcLeft & ~mask) | (srcRight & mask);
      }
    }
  }
  else    // first stage, sort inside one four
  {
    int4 imask0 = (int4)(0, -1, -1, 0);
    srcLeft = theArray[i];
    srcRight = srcLeft.yxwz;
    mask = (srcLeft < srcRight) ^ imask0;
    if (dir)
      srcLeft = (srcLeft & mask) | (srcRight & ~mask);
    else
      srcLeft = (srcLeft & ~mask) | (srcRight & mask);

    srcRight = srcLeft.zwxy;
    mask = (srcLeft < srcRight) ^ imask10;

    if ((i & 1) ^ dir)
    {
      srcLeft = (srcLeft & mask) | (srcRight & ~mask);
      srcRight = srcLeft.yxwz;
      mask = (srcLeft < srcRight) ^ imask11;
      theArray[i] = (srcLeft & mask) | (srcRight & ~mask);
    }
    else
    {
      srcLeft = (srcLeft & ~mask) | (srcRight & mask);
      srcRight = srcLeft.yxwz;
      mask = (srcLeft < srcRight) ^ imask11;
      theArray[i] = (srcLeft & ~mask) | (srcRight & mask);
    }
  }
}

//amds simple bitonic sort
__kernel void bitonicSort(__global uint *theArray, const uint stage, const uint passOfStage,
                          const uint width // amount of items in the array
                          ) {
  uint sortIncreasing = 1;
  uint threadId = get_global_id(0);

  uint pairDistance = 1 << (stage - passOfStage);
  uint blockWidth = 2 * pairDistance;

  uint leftId = (threadId % pairDistance) + (threadId / pairDistance) * blockWidth;

  uint rightId = leftId + pairDistance;

  uint leftElement = theArray[leftId];
  uint rightElement = theArray[rightId];

  uint sameDirectionBlockWidth = 1 << stage;

  if ((threadId / sameDirectionBlockWidth) % 2 == 1) {
    sortIncreasing = 1 - sortIncreasing;
  }

  uint greater;
  uint lesser;
  if (leftElement > rightElement) {
    greater = leftElement;
    lesser = rightElement;
  } else {
    greater = rightElement;
    lesser = leftElement;
  }

  if (sortIncreasing) {
    theArray[leftId] = lesser;
    theArray[rightId] = greater;
  } else {
    theArray[leftId] = greater;
    theArray[rightId] = lesser;
  }
}

__kernel void ParallelSelection_Local(__global const uint *in, __global uint *out,
                                      __local uint *aux) {
  int i = get_local_id(0);    // index in workgroup
  int wg = get_local_size(0); // workgroup size = block size

  // Move IN, OUT to block start
  int offset = get_group_id(0) * wg;
  in += offset;
  out += offset;

  // Load block in AUX[WG]
  uint iData = in[i];
  aux[i] = iData;
  barrier(CLK_LOCAL_MEM_FENCE);

  // Find output position of iData
  uint iKey = iData;
  int pos = 0;
  for (int j = 0; j < wg; j++) {
    uint jKey = aux[j];
    bool smaller = (jKey < iKey) || (jKey == iKey && j < i); // in[j] < in[i] ?
    pos += (smaller) ? 1 : 0;
  }

  // Store output
  out[pos] = iData;
}
