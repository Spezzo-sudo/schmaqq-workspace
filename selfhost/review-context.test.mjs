import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewFreshness} from '../app/review-context.ts';

test('review dialog binds freshness to its exact job, including historical reviews',()=>{
 const change={workspace:'copy',observation:{valid:true,revision:'current'},review:{id:'latest',changedAfter:false,freshness:'same'}};
 assert.equal(reviewFreshness('latest',null,change),'same');
 assert.equal(reviewFreshness('latest',null,{...change,review:{...change.review,changedAfter:true}}),'changed');
 assert.equal(reviewFreshness('old',{revision:'previous'},change),'changed');
 assert.equal(reviewFreshness('old',{revision:'current'},change),'same');
 assert.equal(reviewFreshness('old',null,change),'unverified');
 assert.equal(reviewFreshness('old',{revision:'current'},{...change,observation:{valid:false,revision:'current'}}),'unverified');
 assert.equal(reviewFreshness('old',{revision:'current'},undefined),'unverified');
});
