<context id="1">
  <inputs>
    <input>results</input>
    <input>data</input>
  </inputs>
  <variables/>
  <script>
    <block s="doIfElse">
      <block s="reportListContainsItem">
        <block var="results"/>
        <block var="data"/>
      </block>
      <script>
        <block s="doReport">
          <block var="results"/>
        </block>
      </script>
      <script>
        <block s="doReport">
          <block s="reportCONS">
            <block var="data"/>
            <block var="results"/>
          </block>
        </block>
      </script>
    </block>
  </script>
  <receiver/>
  <context id="134">
    <inputs/>
    <variables/>
    <receiver/>
  </context>
</context>
