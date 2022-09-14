<context id="1">
  <inputs>
    <input><%= field %></input>
    <input>data</input>
  </inputs>
  <variables/>
  <script>
    <block s="doDeclareVariables">
      <list>
        <l>index</l>
        <l>results</l>
        <l>row</l>
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
          <block var="data"/>
        </block>
      </block>
      <script>
        <block s="doSetVar">
          <l>row</l>
          <block s="reportListItem">
            <block var="index"/>
            <block var="data"/>
          </block>
        </block>
        <block s="doIf">
          <block s="reportEquals">
            <block s="reportListItem">
              <l>1</l>
              <block var="row"/>
            </block>
            <block var="<%= field %>"/>
          </block>
          <script>
            <block s="doAddToList">
              <block s="reportListItem">
                <l><%= column %></l>
                <block var="row"/>
              </block>
              <block var="results"/>
            </block>
          </script>
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
  <receiver/>
  <context>
    <inputs/>
    <variables/>
    <receiver/>
  </context>
</context>
