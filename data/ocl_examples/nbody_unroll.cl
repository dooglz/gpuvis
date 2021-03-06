#define UNROLL_FACTOR  8
__kernel 
void nbody_sim(__global float4* pos, __global float4* vel
		,int numBodies ,float deltaTime, float epsSqr
		,__global float4* newPosition, __global float4* newVelocity) {

    unsigned int gid = get_global_id(0);
    float4 myPos = pos[gid];
    float4 acc = (float4)0.0f;


    int i = 0;
    for (; (i+UNROLL_FACTOR) < numBodies; ) {
#pragma unroll UNROLL_FACTOR
        for(int j = 0; j < UNROLL_FACTOR; j++,i++) {
            float4 p = pos[i];
            float4 r;
            r.xyz = p.xyz - myPos.xyz;
            float distSqr = r.x * r.x  +  r.y * r.y  +  r.z * r.z;

            float invDist = 1.0f / sqrt(distSqr + epsSqr);
            float invDistCube = invDist * invDist * invDist;
            float s = p.w * invDistCube;

            // accumulate effect of all particles
            acc.xyz += s * r.xyz;
        }
    }
    for (; i < numBodies; i++) {
        float4 p = pos[i];

        float4 r;
        r.xyz = p.xyz - myPos.xyz;
        float distSqr = r.x * r.x  +  r.y * r.y  +  r.z * r.z;

        float invDist = 1.0f / sqrt(distSqr + epsSqr);
        float invDistCube = invDist * invDist * invDist;
        float s = p.w * invDistCube;

        // accumulate effect of all particles
        acc.xyz += s * r.xyz;
    }

    float4 oldVel = vel[gid];

    // updated position and velocity
    float4 newPos;
    newPos.xyz = myPos.xyz + oldVel.xyz * deltaTime + acc.xyz * 0.5f * deltaTime * deltaTime;
    newPos.w = myPos.w;

    float4 newVel;
    newVel.xyz = oldVel.xyz + acc.xyz * deltaTime;
    newVel.w = oldVel.w;

    // write to global memory
    newPosition[gid] = newPos;
    newVelocity[gid] = newVel;
}