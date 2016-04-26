var expect = require('chai').expect;
var _ = require('../utils');

describe('queryResult(data)', function() {
  [
    [
      {},
      {entities: []}
    ],
    [
      {Items: []},
      {entities: []}
    ],
    [
      {Items: [{id: 'id'}], LastEvaluatedKey: {id: {S: 'id'}}},
      {entities: [{id: 'id'}], position: 'eyJpZCI6eyJTIjoiaWQifX0%3D'}
    ],
  ].forEach(function(t) {
    describe('data: ' + JSON.stringify(t[0]), function() {
      it('should return ' + JSON.stringify(t[1]), function() {
        expect(_.queryResult(function(x) {return x}, _.encode64Obj, t[0])).to.deep.equal(t[1]);
      });
    });
  });
});
