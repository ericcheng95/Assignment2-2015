(function() {
  $.getJSON( '/igMediaCounts')
    .done(function( data ) {
      var yCountsMedia = data.users.map(function(item){
          return item.counts.media;
      });

      var yCountsFollowers = data.users.map(function(item){
          return item.counts.followed_by;
      });

      yCountsMedia.unshift('Media Count');
      yCountsFollowers.unshift('Follower Count');

      var chart = c3.generate({
        bindto: '#chart',
        data: {
          columns: [
            yCountsMedia,
            yCountsFollowers
          ],
          axes: {
            yCountsFollowers: 'y2'
          }/*,
          types: {
            yCountsFollowers: 'bar'
          }*/
        }/*,
        axis: {
          y2: {
            show: true
          }
        }*/
      });

    });
})();
