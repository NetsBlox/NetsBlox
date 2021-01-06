<context id="1">
  <inputs>
    <input><%= dataVariable %></input>
  </inputs>
  <variables/>
  <script>
    <block s="doDeclareVariables">
      <list>
        <l>results</l>
        <l>index</l>
      </list>
    </block>
    <block s="doSetVar">
      <l>results</l>
      <block s="reportNewList">
        <list/>
      </block>
    </block>
    <block s="doSetVar">
      <l>index</l>
      <l>1</l>
    </block>
    <block s="doUntil">
      <block s="reportGreaterThan">
        <block var="index"/>
        <block s="reportListLength">
          <block var="<%= dataVariable %>"/>
        </block>
      </block>
      <script>
        <block s="doAddToList">
          <block s="reportListItem">
            <l>1</l>
            <block s="reportListItem">
              <block var="index"/>
              <block var="<%= dataVariable %>"/>
            </block>
          </block>
          <block var="results"/>
        </block>
        <block s="doChangeVar">
          <l>index</l>
          <l>1</l>
        </block>
      </script>
    </block>
    <block s="doReport">
      <block var="results"/>
    </block>
  </script>
  <receiver></receiver>
  <context id="227">
    <inputs/>
    <variables/>
    <receiver></receiver>
  </context>
</context>
